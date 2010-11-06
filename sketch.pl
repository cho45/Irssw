#!/usr/bin/env perl

use strict;
use warnings;

use Data::Dumper;
sub p ($) { warn Dumper shift }

use Perl6::Say;

use lib glob 'modules/*/lib';
use lib 'lib';

use AnyEvent::Impl::Perl;
use AnyEvent::MPRPC;
use Data::Dumper;
$Data::Dumper::Useqq = 1;

sub irssi () {
	my $client = mprpc_client '127.0.0.1', '4423';
}


#my $res = irssi->call('targets')->recv;
#
#use Data::Dumper;
#warn Dumper $res;

my $res = irssi->call('target' => '#wassr@wassr')->recv;

use Data::Dumper;
warn Dumper $res;
