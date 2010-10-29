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
	my $name   = $dest->{window}->{name} || $dest->{target};
	my $target =  $targets->{$name} ||= {};
	$target->{target} = $dest->{target};
	$target->{refnum} = $dest->{window}->{refnum};
	$target->{name}   = $dest->{window}->{name};
	my $messages = $target->{messages} ||= [];
	push @$messages, +{
		level => $dest->{level},
		text  => $text,
		time  => scalar time(),
	};
	$target->{last_acted} = $dest->{window}->{last_line};
	shift @$messages while @$messages > 500;
}

sub update_channels {
	# TODO remove channels
	no warnings;
	for my $win (Irssi::windows()) {
		my $name = $win->{name} || ($win->{active} && $win->{active}->{name}) || '';
		my $target = $targets->{$name} ||= {};
		$target->{refnum} = $win->{refnum};
		$target->{name}   = $win->{name};
		$target->{last_acted} = $win->{last_line};
	}
}

update_channels();
Irssi::timeout_add(5000, \&update_channels, undef);
Irssi::signal_add_last('print text', 'print_text');

