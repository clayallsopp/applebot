module AppleBot
  class CommandProxy
    class_attribute :proxies
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
        AppleBot.run_command(command.file_name, options)
      })
    end

    def attach_to(klass)
      return if klass.respond_to?(self.namespace)
      namespace = self.namespace
      klass.define_singleton_method(namespace) {
        return AppleBot::CommandProxy.proxies[namespace]
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