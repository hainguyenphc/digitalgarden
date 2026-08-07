---
layout: home
title: Home
---

Welcome to my blog. Here's what I've been writing about.

<!-- index.md or index.html -->
<section class="featured">
  {% for project in site.projects limit:3 %}
    {% include project-card.html project=project %}
  {% endfor %}
</section>

<section class="recent-notes">
  {% assign recent_notes = site.notes | sort: 'date' | reverse | limit: 5 %}
  ...
</section>

<section class="latest-posts">
  <!-- your regular announcement _posts, chronological, small feed -->
</section>
