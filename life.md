---
layout: page
title: Life
permalink: /life
---

<section class="life-index">
  <header class="life-index-header">
    <!-- <h1>Life</h1> -->
    <p class="intro">
      Running, reading, and thinking out loud.
    </p>
  </header>

  {% assign life_posts = site.life | sort: 'date' | reverse %}

  <ul class="life-list">
    {% for post in life_posts %}
    <li class="life-entry">
      <a href="{{ post.url | relative_url }}">
        <span class="life-entry-title">{{ post.title }}</span>
        <span class="life-entry-date">{{ post.date | date: "%b %d, %Y" }}</span>
      </a>
      {% if post.tags %}
      <div class="life-entry-tags">
        {% for tag in post.tags %}<span class="tag">{{ tag }}</span>{% endfor %}
      </div>
      {% endif %}
    </li>
    {% endfor %}
  </ul>
</section>
