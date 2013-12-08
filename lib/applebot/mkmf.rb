module AppleBot
  module_function

  # ripped from mkmf source
  def find_executable(bin, path = nil)
    ext = ""
    if File.expand_path(bin) == bin
      return bin if File.executable?(bin)
      ext and File.executable?(file = bin + ext) and return file
      return nil
    end
    if path ||= ENV['PATH']
      path = path.split(File::PATH_SEPARATOR)
    else
      path = %w[/usr/local/bin /usr/ucb /usr/bin /bin]
    end
    file = nil
    path.each do |dir|
      return file if File.executable?(file = File.join(dir, bin))
      return file if ext and File.executable?(file << ext)
    end
    nil
  end

end