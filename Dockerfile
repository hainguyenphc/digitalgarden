FROM ruby:3.2-slim

# RUN apt-get update -qq && apt-get install -y build-essential git

# Any updates in this file require rebuild.
# docker compose down -v
# docker compose build --no-cache
# docker compose up

RUN apt-get update -qq && apt-get install -y \
    build-essential \
    git \
    # Install openssl, which is a dependency for jekyll-remote-theme.
    # This provides the actual openssl/ssl.h headers and .so libraries the 
    # native extension needs to compile against.
    libssl-dev \
    # Often needed alongside libssl-dev so the extconf.rb build script can 
    # correctly locate OpenSSL on the system.
    pkg-config

WORKDIR /srv/jekyll

RUN gem install bundler jekyll

COPY Gemfile* ./
RUN bundle install

EXPOSE 4000

CMD ["bundle", "exec", "jekyll", "serve", "--host", "0.0.0.0", "--livereload"]
