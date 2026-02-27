require 'json'

package = JSON.parse(File.read(File.join(__dir__, 'package.json')))

Pod::Spec.new do |s|
  s.name         = 'circlebox-react-native'
  s.version      = package['version']
  s.summary      = package['description']
  s.homepage     = 'https://github.com/jeremiahseun/circle-box'
  s.license      = package['license']
  s.authors      = { 'CircleBox' => 'oss@circlebox.dev' }
  s.platforms    = { :ios => '13.0' }
  s.source       = { :git => 'https://github.com/jeremiahseun/circle-box.git', :tag => "v#{s.version}" }

  s.source_files = 'ios/**/*.{h,m,mm,swift}'
  s.requires_arc = true
  s.swift_version = '5.9'

  s.dependency 'React-Core'
  s.dependency 'CircleBoxSDK', s.version.to_s
end
