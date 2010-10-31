package Irssw::User;

use strict;
use warnings;

use Digest::SHA1 qw(sha1_hex);

sub new {
	my ($class, %args) = @_;
	bless  {
		%args
	}, $class;
}

sub rks {
	my ($self) = @_;
	$self->{_rks} ||= sha1_hex($self->{session_id});
}



1;
__END__



