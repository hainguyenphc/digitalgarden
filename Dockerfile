FROM ruby:3.2-slim

RUN apt-get update -qq && apt-get install -y build-essential git

WORKDIR /srv/jekyll

RUN gem install bundler jekyll

COPY Gemfile* ./
RUN bundle install

EXPOSE 4000

CMD ["bundle", "exec", "jekyll", "serve", "--host", "0.0.0.0", "--livereload"]
