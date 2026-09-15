---
layout: note
title: "Why a Kilobyte Isn't 1000 Bytes (and Whose Fault That Is)"
date: 2026-09-14
tags: [cs, hardware]
---

> Working notes — I'm still chewing on this, corrections welcome.

I was flipping through a CompTIA A+ exam guide and hit the chapter on RAM addressing, and it finally clicked why "1 KB" has two different answers depending on who you ask. Writing it down here before I lose the thread.

## It starts with counting wires

A CPU doesn't know what a byte "is." It just has a bundle of address wires, and each wire is either on or off. That's it. One wire gives you 2 states. Two wires give you 4 (00, 01, 10, 11). The pattern is 2^n, where n is the number of wires.

The original 8088 had 20 address wires. So the number of unique addresses it could point to was:

2^20 = 1,048,576

Not a million. 1,048,576. But early computing folks needed a shorthand for that number, and "mega" was sitting right there meaning a million, so they just borrowed it. Close enough, nobody's checking. That's the whole origin story — a convenient approximation that stuck around for decades.

## The binary prefix table

Once you accept that computer memory scales in powers of 2, not powers of 10, the rest of the naming falls out of that same doubling pattern:

| Prefix | Power of 2 | Value |
|---|---|---|
| kilo | 2^10 | 1,024 |
| mega | 2^20 | 1,048,576 |
| giga | 2^30 | 1,073,741,824 |
| tera | 2^40 | 1,099,511,627,776 |

Each step is the previous one multiplied by 1,024, because you're just adding 10 more address wires each time and 2^10 = 1,024.

## Somebody eventually fixed it

By the late 90s the gap between "1024" and "1000" had become an actual engineering problem — math nerds and hard drive manufacturers were arguing past each other, because a "1 GB" drive built on decimal gigabytes has fewer bytes than a "1 GB" RAM stick built on binary gigabytes. Same label, different number.

The IEC stepped in in 1998 and split the terms apart: kilo/mega/giga/tera go back to meaning clean powers of 1000, and a new set of binary-only prefixes gets the awkward names:

| Prefix | Power of 2 | Value |
|---|---|---|
| kibi (Ki) | 2^10 | 1,024 |
| mebi (Mi) | 2^20 | 1,048,576 |
| gibi (Gi) | 2^30 | 1,073,741,824 |
| tebi (Ti) | 2^40 | 1,099,511,627,776 |

Same numbers as the table above — it's just that now "1 KiB" is unambiguously the binary one, and "1 KB" is supposed to be the clean decimal one.

## Why it still feels messy today

Almost nobody outside a standards document actually says "gibibyte" out loud. RAM specs and OS memory readouts still use the old binary-flavored KB/MB/GB out of habit, while drive manufacturers advertise capacity in clean decimal GB/TB because it makes for a bigger number on the box. That mismatch is exactly why you buy a "1 TB" drive and your OS reports something like 931 GB — the drive was built with decimal terabytes, the OS is reporting it in binary ones.

So: two labeling systems, one hardware reality, and a standards body that showed up about twenty years too late to stop people from calling 1,048,576 a "megabyte." Once you see the 2^n underneath it, none of it is arbitrary — it's just legacy naming that never fully got cleaned up.
