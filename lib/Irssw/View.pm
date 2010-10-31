package Irssw::View;

use strict;
use warnings;
use utf8;

use Exporter::Lite;
use Encode;
our @EXPORT = qw(html json);

sub html {
	my ($r, $name) = @_;
	Text::MicroTemplate->use or die;

	my $template = decode_utf8($r->config->root->file('templates', $name)->slurp);
	eval {
		my $rr = do {
			my $mt = Text::MicroTemplate->new( template => $template );
			my $cc = $mt->code;
			eval qq{
				sub {
					local \$_ = shift;
					my \$r = \$_->{r};
					$cc->();
				}
			};
		};
		my $content = $rr->($r->stash);

		$r->res->header("Content-Type" => "text/html");
		$r->res->body(encode_utf8($content));
	};
	if ($@) {
		die $@ ;
	}
}


sub json ($) {
	my ($r, $obj) = @_;
	JSON->use or die;
	my $json = JSON->new->utf8->encode($obj);

	$r->res->header("Content-Type" => "application/json");
	$r->res->body($json);
}



1;
__END__



