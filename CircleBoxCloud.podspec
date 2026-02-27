Pod::Spec.new do |s|
  s.name             = 'CircleBoxCloud'
  s.version          = '0.3.1'
  s.summary          = 'Cloud uploader companion for CircleBox on iOS.'
  s.description      = <<-DESC
CircleBoxCloud provides queueing, retry, idempotent upload, and usage-beacon
telemetry for CircleBox exports on iOS applications.
                       DESC
  s.homepage         = 'https://github.com/jeremiahseun/circle-box'
  s.license          = { :type => 'MIT', :file => 'ios/CircleBoxCloud/LICENSE' }
  s.author           = { 'CircleBox' => 'oss@circlebox.dev' }
  s.platform         = :ios, '13.0'
  s.swift_version    = '5.9'
  s.source           = { :git => 'https://github.com/jeremiahseun/circle-box.git', :tag => "v#{s.version}" }
  s.source_files     = 'ios/CircleBoxCloud/Sources/CircleBoxCloud/**/*.swift'
  s.dependency       = 'CircleBoxSDK', s.version.to_s
end
