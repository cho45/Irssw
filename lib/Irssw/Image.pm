package Irssw::Image;

use strict;
use warnings;
use LWP::UserAgent;
use Digest::SHA1 qw(sha1_hex);
use Path::Class;
use File::Spec;
use Image::Imlib2;
use File::Temp qw(tempfile);

our $cache_root = dir(File::Spec->tmpdir)->subdir('irssi.images');
our $expires    = 60 * 60 * 24;

our $ua = LWP::UserAgent->new;
$ua->timeout(10);

sub get {
	my ($class, $url, %opts) = @_;
	my ($type, $img);
	local $_ = $url;
	/\.jpe?g$/ and $type = 'jpeg';
	/\.png$/   and $type = 'png';
	/\.gif$/   and $type = 'gif';

	my $file = $class->_get_file($url);
	if ($file) {
		$img = Image::Imlib2->load("$file");
		
		if ($img->width < $opts{width} &&
			$img->height < $opts{height}) {

			my $fh = $file->openr;
			return +{
				content_type => "image/$type",
				content => $fh
			};
		}

		my ($w, $h) = (0, 0);
		if ($img->width > $img->height) {
			$w = $opts{width};
		} else {
			$h = $opts{height};
		}

		$img = $img->create_scaled_image($w, $h);
		$type = 'jpeg'; ## XXX: force
	} else {
		$img = Image::Imlib2->new($opts{width}, 100);
		$img->set_color(127, 127, 127, 255);
		$img->fill_rectangle(0, 0, $img->width, $img->height);
		$type = "png";
	}

	$img->set_quality(30);
	$img->image_set_format($type);
	my ($fh, $filename) = tempfile();
	$img->save($filename);
	seek $fh, 0, 0;

	+{
		content_type => "image/$type",
		content => $fh
	};
}

sub _get_file {
	my ($class, $url) = @_;
	my $key  = sha1_hex($url);
	my $file = $class->_cache_file($key);

	if (-e $file) {
		$file;
	} else {
		my ($class, $url) = @_;
		my $res = $ua->get($url);
		if ($res->is_success) {
			my $fh = $file->openw;
			binmode $fh;
			print $fh $res->content;
			close $fh;
			$file;
		} else {
			undef;
		}
	}
}

sub _cache_file {
	my ($class, $key) = @_;
	my $dir = $cache_root->subdir(@{[ split //, $key ]}[0..3]);
	$dir->mkpath;
	my $file = $dir->file($key);
}

sub gc {
	my ($class) = @_;
	my $now = time();
	$cache_root->recurse(depthfirst => 1, preorder => 0, callback => sub {
		my $f = shift;
		if ($f->is_dir) {
			unless ($f->children) {
				$f->remove;
			}
		} else {
			if ($f->stat->mtime < $now - $expires) {
				warn "$f is expired";
				$f->remove;
			}
		}
	});
}


1;
__END__



