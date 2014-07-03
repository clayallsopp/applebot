module BotLib
  class CommandProxy
    class_attribute :proxies
    class_attribute :bot
    self.proxies = {}

    attr_accessor :namespace, :commands

    def self.for(command)
      proxies[command.namespace] ||= new(command.namespace)
      proxy = proxies[command.namespace]
      proxy.add_command(command)
      proxy
    end

    def initialize(namespace)
      @namespace = namespace
      @commands = []
    end

    def add_command(command)
      return if @commands.include?(command.action)
      @commands << command.action
      define_singleton_method(command.action, ->(options = {}) {
        self.class.bot.run_command(command.file_name, options)
      })
    end

    def attach_to(klass)
      return if klass.respond_to?(self.namespace)
      namespace = self.namespace
      proxy_class = self.class
      klass.define_singleton_method(namespace) {
        return proxy_class.proxies[namespace]
      }
    end

    def inspect
      s = self.to_s.gsub(">", " ")
      s << "commands: #{@commands.join(', ')}"
      s << ">"
      s
    end

  end
end