#!perl -Imodules/Plack/lib modules/Plack/scripts/plackup -r -app 
use strict;
use warnings;
use utf8;
use lib glob 'modules/*/lib';
use lib glob 'extlib/*/lib';

use UNIVERSAL::require;
use Plack::Builder;
use Path::Class;
use File::Basename qw(dirname);
use Cache::MemoryCache;
use WebService::Google::Closure;

use Irssw;

my $handler = \&Irssw::run;

builder {
	enable "Plack::Middleware::ContentLength";

	enable "Plack::Middleware::Static",
		path => qr{^//?(?:js|css|images)/}, root => dirname(__FILE__) . '/../static/';

	enable "StaticShared",
		cache => Cache::MemoryCache->new,
		base  => './static/',
		binds => [
			{
				prefix       => '/.shared.js',
				content_type => 'text/javascript; charset=utf8',
				filter       => sub {
					WebService::Google::Closure->new(js_code => $_)->compile->code;
				}
			},
			{
				prefix       => '/.shared.css',
				content_type => 'text/css; charset=utf8',
			}
		];



	enable "Plack::Middleware::ReverseProxy";
	enable "Session", store => 'File';

	$handler;
};

