use strict;
use warnings;

use Glib;
use Encode;

use Irssi::Irc;
use AnyEvent::MPRPC;

our $targets = {};
our $server = mprpc_server '127.0.0.1', '4423';
$server->reg_cb(
	command => sub {
		my ($res, $refnum, $command) = @_;
		my $item = Irssi::window_find_refnum($refnum);
		if ($item) {
			$item->command($command);
			$res->result('ok');
		} else {
			$res->result('not found');
		}
	},
	targets  => sub {
		my ($res, @params) = @_;
		$res->result(+{
			map {
				my $t = +{ %{ $targets->{$_} } };
				delete $t->{messages};
				$_ => $t;
			}
			keys %$targets
		});
	},
	target => sub {
		my ($res, $target) = @_;
		$res->result($targets->{$target});
	},
	eval => sub {
		my ($res, $code) = @_;
		$res->result(eval($code));
	}
);

sub print_text {
	my ($dest, $text, $stripped) = @_;
	if ($dest->{level} & (
		MSGLEVEL_PUBLIC  |
		MSGLEVEL_NOTICES |
		MSGLEVEL_SNOTES  |
		MSGLEVEL_ACTIONS |
		MSGLEVEL_INVITES
	)) {
		my $target =  $targets->{$dest->{target}} ||= {};
		$target->{refnum} = $dest->{window}->{refnum};
		my $messages = $target->{messages} ||= [];
		push @$messages, +{
			text => $text,
			time => scalar time(),
		};
		$target->{last_acted} = time();
		shift @$messages while @$messages > 500;
	}
}

Irssi::signal_add('print text', 'print_text');

