#!perl -Imodules/Plack/lib modules/Plack/scripts/plackup -r -app 
use strict;
use warnings;
use utf8;
use lib glob 'modules/*/lib';
use lib glob 'extlib/*/lib';
use lib "$ENV{HOME}/project/Plack-Middleware-StaticShared/lib";

use UNIVERSAL::require;
use Plack::Builder;
use Path::Class;
use File::Basename qw(dirname);
use Cache::File;
use File::Spec;
use WebService::Google::Closure;

use Irssw;

my $root    = file(__FILE__)->parent->parent->absolute;
my $handler = \&Irssw::run;

builder {
	enable "Plack::Middleware::ReverseProxy";

	enable "Plack::Middleware::ContentLength";

	enable "Plack::Middleware::Static",
		path => qr{^//?(?:js/|css/|images/|favicon\.)}, root => $root->subdir('static'),

	enable "Plack::Middleware::AccessLog::Timed",
		format => "%h %l %u %t \"%r\" %>s %b %D";


	enable "StaticShared",
		cache => Cache::File->new(cache_root => File::Spec->tmpdir . '/irssw.static-shared', default_expires => '7 days'),
		base  => $root->subdir('static'),
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



	enable "Session", store => 'File';

	$handler;
};

