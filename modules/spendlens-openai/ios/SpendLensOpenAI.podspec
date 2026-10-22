Pod::Spec.new do |s|
  s.name = 'SpendLensOpenAI'
  s.version = '1.0.0'
  s.summary = 'On-device OpenAI OAuth and receipt inference for SpendLens'
  s.description = s.summary
  s.license = { :type => 'MIT' }
  s.author = 'SpendLens'
  s.homepage = 'https://developers.openai.com/siwc'
  s.platforms = { :ios => '16.4' }
  s.swift_version = '5.9'
  s.source = { :git => '' }
  s.static_framework = true
  s.dependency 'ExpoModulesCore'
  s.frameworks = 'AuthenticationServices', 'Network', 'Security', 'CryptoKit'
  s.source_files = '**/*.swift'
  s.pod_target_xcconfig = { 'DEFINES_MODULE' => 'YES', 'SWIFT_COMPILATION_MODE' => 'wholemodule' }
end
