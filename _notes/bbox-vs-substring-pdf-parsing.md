---
title: "Bounding Boxes vs. Substring Matching: A PDF Parsing Bug Hunt"
date: 2026-09-04
collection: notes
category: rag
tags: [pymupdf, pdf-parsing, rag, parsing]
status: published
summary: "Two real bugs in a PDF table-exclusion filter, found by building a deliberately mean test PDF: a substring-matching false negative, and a span-fragmentation bug introduced while fixing it."
---

So I'm going through *[Hands-On RAG for Production](https://www.oreilly.com/library/view/hands-on-rag-for/9798341621701/)* by Ofer Mendelevitch for fun (well, "fun") over the last couple weeks, and chapter 2 has this PDF parsing example that's actually kind of broken. Not in an obvious way — it works fine on the book's own sample doc, prints the nice clean output the text promises, everyone moves on. But I built a slightly meaner test PDF than the one the book uses, and it fell over almost immediately. Then I fixed it, and *that* fix broke in a different way. Figured it was worth writing up because the whole thing is a decent little lesson in why "parsing" is the phase of RAG nobody wants to talk about at parties.

## the setup

Goal: you've got a PDF with some paragraphs and some tables in it, and you want to pull out just the paragraphs. `page.get_text()` in PyMuPDF just gives you one big string with everything mashed together — table cells and prose all in one soup. `page.get_text("blocks")` chunks it a bit but still doesn't tell you which chunk is a table. So the book's approach is: find each table's bounding box, grab the text inside that box separately, and then filter your full text against it.

I made a test PDF to poke at this. Two tables:

| Table 1 |  |
|---|---|
| Revision | Year |
| 0.0.1 | 2024 |

| Table 2 |  |  |  |
|---|---|---|---|
| Book | Revision | Year | Author |
| Memory and RAG | 0.1.0 | Year 2026 | A great researcher |
| RAG and AI | 0.0.1 | Year 2025 | |

...then a sentence — *"I am learning the **hands-on RAG** book."*, with "hands-on RAG" bolded — then, on its own line by itself, just the number `2025`. Then a picture of a dog, which is unrelated, I just needed an image on there for a different part of the exercise.

That lonely `2025` isn't random. I put it there on purpose because it's a landmine, and here's why.

## v0: what the book actually does, and why it eats the 2025

The book's logic: pull the text inside each table's bbox using `page.get_text(clip=bbox)`, then go line by line through the whole page's text, and drop any line that turns out to be a **substring** of any of those table texts. Roughly:

```python
for line in lines:
    line = line.strip()
    if line:
        is_table_content = False
        for table_text in table_text_blocks:
            if line in table_text:
                is_table_content = True
                break
        if not is_table_content:
            filtered_lines.append(line)
```

Table 2's clipped text has the cell `"Year 2025"` sitting in it. My standalone footer is literally the string `"2025"`. And `"2025" in "...Year 2025"` is just `True`. So my totally unrelated footer line, which lives nowhere near either table on the page, gets treated as table content and silently dropped.

Ran it, and yeah:

```
Sample doc for RAG Book chapter 2
This is a great chapter
```

No `2025`. No error either — it just isn't there, which is the annoying part. This kind of thing doesn't show up in a code review, it shows up three months later when someone notices a chunk of your knowledge base is missing a fact and nobody can figure out why. And it'll happen constantly on real documents, because "a short number or string that happens to also appear somewhere in a table" describes basically every date, page number, or version string ever written.

## v1: okay, use geometry instead — except now something else breaks

The real fix is obvious once you say it out loud: stop comparing *text* and start comparing *position*. A line is part of a table if it's sitting on top of the table, not if its characters happen to look like the table's characters. To get positions you need `page.get_text("dict")` instead of the plain string version, since that's the mode that actually hands you a bounding box per span.

First attempt at this:

```python
for block in page_text["blocks"]:
    if block["type"] == 0:
        for line in block["lines"]:
            for span in line["spans"]:
                is_table_content = False
                line_text = span["text"].strip()
                if line_text:
                    for table_bbox in table_bbox_store:
                        r1 = pymupdf.Rect(line["bbox"])
                        r2 = pymupdf.Rect(table_bbox)
                        overlap_rect = r1 & r2
                        overlap_rect_area = overlap_rect.get_area()
                        if overlap_rect_area > (0.5 * r1.get_area()):
                            is_table_content = True
                            break
                    if not is_table_content:
                        filtered_lines.append(line_text)
```

`r1 & r2` is PyMuPDF's built-in rectangle intersection, so no manual clamping garbage needed. The rule is: if more than half of a line's own bbox area overlaps a table's bbox, call it table content. This part's genuinely fine, and it fixes the original bug — the `2025` survives now since it's nowhere near either table geometrically.

But then I ran it on the sentence with the bold bit in it and got this:

```
Sample doc for RAG Book chapter 2
This is a great chapter
I am learning the
hands-on RAG
book.
2025
```

One sentence turned into three lines. Great, fixed one thing, broke another.

Turns out `page_text["dict"]` chops a line into **spans** every time the *formatting* changes — bold, italic, font size, whatever — not every time there's an actual word boundary. So "I am learning the **hands-on RAG** book." is three formatting runs on one visual line, and the loop above was deciding table-membership *and appending to the output* separately for each span. Three spans, three lines out.

Funny thing is v0 never hit this, but not because v0 is smarter. It's because `page.get_text()` in plain mode already glues the spans back together into flat lines for you, before you ever see them. The second I dropped down to `"dict"` mode to get the bounding boxes the real fix actually needed, I inherited the job of gluing things back together myself, and forgot to do it. Classic "fixed the bug by moving one level down, and that level has its own bugs" situation.

## v2: decide per line, not per span

Two fixes. The overlap check now happens once per `line` (using `line["bbox"]`) instead of getting redundantly recomputed for every single span inside that line — the geometry's identical across spans on the same line, so the original code was just repeating itself for no reason on top of being wrong. And the line's text is built by joining all its spans together *once*, instead of each span getting pushed to the output on its own:

```python
for block in page_text["blocks"]:
    if block["type"] == 0:
        for line in block["lines"]:
            line_text = "".join(
                span["text"] for span in line["spans"]
            ).strip()
            if not line_text:
                continue

            is_table_content = False
            r1 = pymupdf.Rect(line["bbox"])
            for table_bbox in table_bbox_store:
                r2 = pymupdf.Rect(table_bbox)
                overlap_rect = r1 & r2
                overlap_rect_area = overlap_rect.get_area()
                if overlap_rect_area > (0.5 * r1.get_area()):
                    is_table_content = True
                    break

            if not is_table_content:
                filtered_lines.append(line_text)
```

Small thing that actually matters a lot: the join separator. It has to be `""`, not `" "`. Spans split at formatting boundaries, not word boundaries, and each span already includes whatever whitespace was really there. `"this is a "` + `"great"` + `" chapter"` joined with `""` gives you back `"this is a great chapter"`, exactly right. Join with `" "` and you get `"this is a  great  chapter"` — a double space, because you're adding a space on top of one that already existed. It gets worse if the bold/italic switch happens mid-word — say `"impor"` is italic and `"tant"` isn't. `""` correctly rebuilds `"important"`. `" "` gives you `"impor tant"`, which is just wrong. So `""` isn't a stylistic pick, it's the only option that's actually consistent with what a span is.

Ran it on both files:

```
Sample doc for RAG Book chapter 2
This is a great chapter
2025
```
```
Sample doc for RAG Book chapter 2
This is a great chapter
I am learning the hands-on RAG book.
2025
```

Both good. Table content's gone, the `2025` survives, and the bold sentence is back to being one line.

## scorecard

| | drops real table content | keeps the `2025` footer | keeps the bold sentence whole |
|---|:---:|:---:|:---:|
| v0 — book, `if line in table_text` | ✅ | ❌ | ✅ *(kind of by accident)* |
| v1 — bbox, checked per span | ✅ | ✅ | ❌ |
| v2 — bbox, checked per line | ✅ | ✅ | ✅ |

That last checkmark for v0 bugs me a little, honestly — it's not passing because the logic is good, it's passing because plain-text mode never put it in a position to fail in the first place. Which, weirdly, is also *why* it needed the substring hack to begin with: less structural info from the API means fewer footguns, but also fewer tools to actually solve the problem.

## what I'm taking away from this

Don't trust "this text is a substring of that text" to tell you anything structural about a document. Two totally unrelated pieces of a PDF can share characters purely by coincidence — a year, a version number, whatever — and that kind of bug fails silently. Nothing crashes. A line just quietly isn't in your output anymore, and you won't notice until you go looking for it.

Also: fixing a bug by dropping to a lower-level API doesn't mean the bug is gone, it might just mean it moved. Plain text extraction hides span boundaries from you. Dict-mode extraction gives you the bounding boxes you actually wanted, but now reassembling the text is your job, and I just... didn't do it, the first time. Every layer trades some stuff away for other stuff — worth checking what you actually lost before assuming a fix is done.

And honestly, the biggest thing: neither of these bugs shows up on the book's own example PDF. You only find them if you go build something meaner than the textbook version on purpose. Took like five minutes to make a PDF with a landmine in it, and it caught two real bugs a "happy path" test never would have.

All three implementations, sample test files, and both trap PDFs are up at [this Drive folder](https://drive.google.com/drive/folders/1jNMxVOKpjH-vq83vk1XMfViB8l5-v_Dj?usp=sharing) if you want to run this yourself instead of taking my word for it.

---
*Reference: Ofer Mendelevitch,* [Hands-On RAG for Production](https://www.amazon.ca/Hands-RAG-Production-Production-Ready-Applications/dp/B0G48HGR81)*, O'Reilly, ch. 2.*
