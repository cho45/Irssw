BEGIN {
	my @mip = qw(
		Module::Install::AuthorTests
		Module::Install::Repository
		Module::Install::ReadmeFromPod
		Module::Install::TestBase
	);
	for (@mip) {
		eval "require $_";
		if ($@) {
			warn $@;
			printf("# Install following (perl Makefile.PL | cpanm):\n%s", join("\n", @mip));
			exit 1;
		}
	}
};

use inc::Module::Install;

name 'Irssw';
all_from 'lib/Irssw.pm';

requires 'LWP::UserAgent';
requires 'Path::Class';
requires 'AnyEvent';
requires 'AnyEvent::MPRPC';
requires 'Encode';
requires 'Path::Class';
requires 'Plack';
requires 'Plack::Middleware::ReverseProxy';
# Direct install from 
# cpanm https://github.com/cho45/Plack-Middleware-StaticShared/tarball/master
# requires 'Plack-Middleware-StaticShared';
requires 'Starman';
requires 'Image::Imlib2';
requires 'Digest::SHA1';
requires 'File::Temp';
requires 'File::Spec';
requires 'JSON';
requires 'Text::MicroTemplate';
requires 'Cache::MemoryCache';
requires 'WebService::Google::Closure';
requires 'FindBin';
requires 'Getopt::Long';
requires 'Pod::Usage';
requires 'Perl6::Say';

build_requires 'Test::Most';
auto_include_deps;

author_tests('xt');

auto_set_repository;

use_test_base;

readme_from 'lib/Irssw.pm';

WriteAll;
