---
layout: page
title: Notes
permalink: /notes/
---
<section class="notes-index">
  <header class="notes-index-header">
    <!-- <h1>Notes</h1> -->
    <p class="intro">Course material and technical notes as I work through my CS degree.</p>
  </header>

  {% assign all_notes = site.notes | sort: 'date' | reverse %}

  <ul class="notes-list">
    {% for note in all_notes %}
      <li class="notes-entry">
        <a href="{{ note.url | relative_url }}">
          <span class="notes-entry-title">{{ note.title }}</span>
          <span class="notes-entry-date">{{ note.date | date: "%b %d, %Y" }}</span>
        </a>
        {% if note.categories %}
          <div class="notes-entry-categories">
            {% for category in note.categories %}
              <span class="notes-entry-category">{{ category }}</span>
            {% endfor %}
          </div>
        {% endif %}
      </li>
    {% endfor %}
  </ul>
</section>
