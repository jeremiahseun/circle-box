Pod::Spec.new do |s|
  s.name             = 'CircleBoxSDK'
  s.version          = '0.3.1'
  s.summary          = 'Native flight recorder SDK for iOS crash context capture.'
  s.description      = <<-DESC
CircleBox captures pre-crash system context into a fixed-size ring buffer and
exports deterministic crash narratives for iOS applications.
                       DESC
  s.homepage         = 'https://github.com/jeremiahseun/circle-box'
  s.license          = { :type => 'MIT', :file => 'ios/CircleBoxSDK/LICENSE' }
  s.author           = { 'CircleBox' => 'oss@circlebox.dev' }
  s.platform         = :ios, '13.0'
  s.swift_version    = '5.9'
  s.source           = { :git => 'https://github.com/jeremiahseun/circle-box.git', :tag => "v#{s.version}" }
  s.source_files     = 'ios/CircleBoxSDK/Sources/CircleBoxSDK/**/*.swift'
  s.libraries        = 'z'
end
