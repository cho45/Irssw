package Irssw::Page;

use HTML::HeadParser;
use URI::Fetch;
use Cache::File;
use Encode;
use LWPx::ParanoidAgent;
use File::Spec;

use Coro;
use Coro::LWP;

my $cache = Cache::File->new( cache_root => File::Spec->tmpdir . '/irssw.pages' );
my $ua    = LWPx::ParanoidAgent->new;
$ua->timeout(3);
warn( File::Spec->tmpdir . '/irssw.pages' );

sub title {
	my ($class, $url) = @_;
	warn $url;
	my $title = $cache->get("title:$url");
	unless (defined $title) {
		my $page = $class->get($url);
		if ($page) {
			$title = decode($page->{charset}, $page->{header}->header('Title'));
		} else {
			$title = $url;
		}
		$cache->set("title:$url" => $title);
	}
	decode_utf8($title);
}

sub get {
	my ($class, $url) = @_;
	my $res = URI::Fetch->fetch($url, Cache => $cache, UserAgent => $ua) or return undef;

	my $p = HTML::HeadParser->new;
	$p->parse($res->content);
	my $charset = do {
		local ($_) = ($res->content_type =~ /charset=(\S+)/);
		local ($_) = ($p->header('Content-Type') =~ /charset=(\S+)/) unless $_;
		$_ || 'utf8';
	};

	+{
		charset => $charset,
		header  => $p->header,
		decoded_content => decode($charset, $res->content)
	};
}

sub get_multi {
	my ($class, $urls) = @_;
	my %titles;

	for my $u (@$urls) {
		$titles{$u} = async {
			$class->title($u);
		};
		cede;
	}

	for my $u (@$urls) {
		$titles{$u} = $titles{$u}->join if ref($titles{$u});
	}

	\%titles;
}

1;
