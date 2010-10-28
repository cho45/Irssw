package Irssw::Request;

use strict;
use warnings;
use base qw(Plack::Request);
use Irssw::Browser;

sub browser {
	my ($self) = @_;
	$self->{_browser} ||= Irssw::Browser->new($self->user_agent);
}

1;
__END__



