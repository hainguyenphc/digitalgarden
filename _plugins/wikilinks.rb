module Jekyll
  module WikilinkFilter
    def self.convert(content, site)
      baseurl = site.config['baseurl'] || ''

      content.gsub(/\[\[([^\]]+)\]\]/) do
        slug = $1.strip
        target = site.posts.docs.find { |doc| doc.basename_without_ext == slug }

        if target
          full_url = File.join(baseurl, target.url)
          "<a href=\"#{full_url}\" class=\"wikilink\">#{target.data['title'] || slug}</a>"
        else
          "<span class=\"wikilink-missing\" title=\"Note not found: #{slug}\">#{slug}</span>"
        end
      end
    end
  end

  Jekyll::Hooks.register [:posts, :pages], :post_render do |doc|
    doc.output = WikilinkFilter.convert(doc.output, doc.site)
  end
end
