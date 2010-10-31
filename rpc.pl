use strict;
use warnings;

use Glib;
use Encode;
use JSON::XS;

use Irssi::Irc;
use AnyEvent::MPRPC;

{
	package Irssi::Nick; # wtf?
};

our $targets = {};
our $server = mprpc_server '127.0.0.1', '4423';
$server->reg_cb(
	command => sub {
		my ($res, $args) = @_;
		my ($refnum, $command) = @$args;
		no warnings;
		my $item = Irssi::window_find_refnum($refnum+0);
		if ($item) {
			$item->command($command);
			$res->result('ok');
		} else {
			$res->result('not found');
		}
	},
	targets  => sub {
		my ($res, @params) = @_;
		update_channels();
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
		update_channels();
		$res->result($targets->{$target});
	},
	eval => sub {
		my ($res, $code) = @_;
		$res->result(eval($code));
	}
);

sub update_channels {
	# TODO remove channels
	no warnings;
	for my $win (Irssi::windows()) {
		my $name = $win->{name} || ($win->{active} && $win->{active}->{name}) || '';
		my $target = $targets->{$name} ||= {};
		$target->{refnum} = $win->{refnum};
		$target->{name}   = $win->{name};
	}
}

sub append_message {
	my ($name, $message) = @_;
	my $target = $targets->{$name} ||= {};
	my $messages = $target->{messages} ||= [];
	if ($message->{nick} eq 'metadata' && !$message->{mask}) {
		if (my $m = $target->{messages}->[-1]) {
			eval {
				$target->{messages}->[-1] = {
					%$m,
					%{ decode_json($message->{text}) }
				};
			};
		}
		return;
	}
	$message->{time} = time();
	$target->{last_acted} = time();
	push @$messages, $message;
	shift @$messages while @$messages > 500;
}

Irssi::signal_add_last('message public', sub {
	my ($server, $recoded, $nick, $addr, $target) = @_;
	# $server: isa Irssi::Irc::Server
	# $recoded: 'aaaaaaa'
	# $nick: 'foobar'
	# $addr: 'id=002922721@api.twitter.com'
	append_message($target, +{
		level => MSGLEVEL_PUBLIC,
		nick  => $nick,
		text  => $recoded,
		mask  => $addr,
	});
});

Irssi::signal_add_last('message own_public', sub {
	my ($server, $msg, $target, $origintarget) = @_;
	append_message($target, +{
		level => MSGLEVEL_PUBLIC,
		nick  => $server->{nick},
		text  => $msg,
		mask  => $server->{address},
	});
});

Irssi::signal_add_last('message private', sub {
	my ($server, $recoded, $nick, $addr, $target) = @_;
	append_message($target, +{
		level => MSGLEVEL_MSGS,
		nick  => $nick,
		text  => $recoded,
		mask  => $addr,
	});
});

Irssi::signal_add_last('message own_private', sub {
	my ($server, $msg, $target, $origintarget) = @_;
	append_message($target, +{
		level => MSGLEVEL_MSGS,
		nick  => $server->{nick},
		text  => $msg,
		mask  => $server->{address},
	});
});

Irssi::signal_add_last('message irc action', sub {
	my ($server, $recoded, $nick, $addr, $target) = @_;
	append_message($target, +{
		level => MSGLEVEL_ACTIONS,
		nick  => $nick,
		text  => $recoded,
		mask  => $addr,
	});
});

Irssi::signal_add_last('message irc own_action', sub {
	my ($server, $msg, $target, $origintarget) = @_;
	append_message($target, +{
		level => MSGLEVEL_ACTIONS,
		nick  => $server->{nick},
		text  => $msg,
		mask  => $server->{address},
	});
});

Irssi::signal_add_last('message irc notice', sub {
	my ($server, $recoded, $nick, $addr, $target) = @_;
	append_message($target, +{
		level => MSGLEVEL_NOTICES,
		nick  => $nick,
		text  => $recoded,
		mask  => $addr,
	});
});

Irssi::signal_add_last('message irc own_notice', sub {
	my ($server, $msg, $target, $origintarget) = @_;
	append_message($target, +{
		level => MSGLEVEL_NOTICES,
		nick  => $server->{nick},
		text  => $msg,
		mask  => $server->{address},
	});
});

#Irssi::signal_add_last('print text', sub {
#	my ($dest, $text, $stripped) = @_;
#
#	# handle with each own signal
#	($dest->{level} & (
#		MSGLEVEL_PUBLIC |
#		MSGLEVEL_NOTICES |
#		MSGLEVEL_ACTIONS
#	) ) and return;
#
#	my $name   = $dest->{window}->{name} || $dest->{target};
#	my $target =  $targets->{$name} ||= {};
#	$target->{target} = $dest->{target};
#	$target->{refnum} = $dest->{window}->{refnum};
#	$target->{name}   = $dest->{window}->{name};
#	my $messages = $target->{messages} ||= [];
#	push @$messages, +{
#		level => $dest->{level},
#		text  => $text,
#		time  => scalar time(),
#	};
#	$target->{last_acted} = $dest->{window}->{last_line};
#	shift @$messages while @$messages > 500;
#});


