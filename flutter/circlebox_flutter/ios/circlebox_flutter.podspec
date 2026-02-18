Pod::Spec.new do |s|
  s.name             = 'circlebox_flutter'
  s.version          = '0.1.0'
  s.summary          = 'Flutter bridge for CircleBox SDK'
  s.description      = <<-DESC
Flutter bridge plugin for CircleBox native SDK.
                       DESC
  s.homepage         = 'https://github.com/circlebox/circlebox'
  s.license          = { :type => 'MIT', :file => '../LICENSE' }
  s.author           = { 'CircleBox' => 'oss@circlebox.dev' }
  s.source           = { :path => '.' }
  s.source_files = 'Classes/**/*'
  s.dependency 'Flutter'
  s.platform = :ios, '13.0'
  s.swift_version = '5.9'
  s.pod_target_xcconfig = { 'DEFINES_MODULE' => 'YES' }
end
