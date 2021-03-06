package Irssw;
use 5.8.8;
use strict;
use warnings;
use utf8;

use Path::Class;
use URI;
use Encode;
use UNIVERSAL::require;

use Irssw::Router;
use Irssw::Request;
use Irssw::View;
use Irssw::User;

use Irssw::Image;

use Irssw::Config;

use AnyEvent::Impl::Perl;
use AnyEvent::MPRPC;
use Data::Dumper;
$Data::Dumper::Useqq = 1;

our $VERSION = time();

sub irssi () {
	my $client = mprpc_client '127.0.0.1', '4423';
}

route '/', action => sub {
	my ($r) = @_;
	$r->require_user or return;
	if ($r->device) {
		return $r->res->redirect('/' . $r->device . $r->req->path_info);
	}

	$r->html('index.html');
};

route '/touch/', action => sub {
	my ($r) = @_;
	$r->require_user or return;
	$r->html('touch/index.html');
};

route '/redirect', action => sub {
	my ($r) = @_;
	$r->require_user or return;
	$r->html('redirect.html');
};

route '/image', action => sub {
	my ($r) = @_;
	$r->require_user or return;
	my $url    = $r->req->param('l');
	my $width  = $r->req->param('w') || 800;
	my $height = $r->req->param('h') || 600;

	my $img = Irssw::Image->get($url, width => $width, height => $height);
	$r->res->content_type($img->{content_type});
	$r->res->content($img->{content});
};


#route '/:id', id => qr/\d+/, action => sub {
#	my ($r) = @_;
#};

route '/login', method => GET, action => sub {
	my ($r) = @_;
	$r->html('login.html');
};

route '/login', method => POST, action => sub {
	my ($r) = @_;
	my $password = $r->req->param('password') || '';
	if ($password eq $r->config->{password}) {
		$r->session->set(authorized => 1);
		$r->res->redirect('/');
	} else {
		$r->res->redirect('/login?failed=1');
	}
};

route '/logout', action => sub {
	my ($r) = @_;
	$r->session->expire;
	$r->res->redirect('/login');
};

route '/api/command', method => POST, action => sub {
	my ($r) = @_;
	$r->require_user or return;
	$r->require_rks  or return;
	my $refnum  = $r->req->param('refnum');
	my $command = $r->req->param('command');
	my $result  = irssi->call('command' => [$refnum => $command])->recv;
	$r->json({
		status => $result
	});
};

route '/api/channels', method => GET, action => sub {
	my ($r) = @_;
	$r->require_user or return;
	my $targets  = irssi->call('targets')->recv;
	my $channels = [
		sort {
			($b->{last_acted} || 0) <=> ($a->{last_acted} || 0);
		}
		map {
			my $t = $targets->{$_};
			$t->{name} =  decode_utf8 $_;
			$t;
		}
		grep {
			my $channel_filter = $r->config->{channel_filter};
			$channel_filter ? $channel_filter->($_) : 1;
		}
		keys %$targets
	];
	$r->json({
		channels => $channels
	});
};

route '/api/channel', method => GET, action => sub {
	my ($r) = @_;
	$r->require_user or return;

	my $target  = decode_utf8 $r->req->param('c');
	my $channel = irssi->call('target' => $target)->recv;

	unless ($channel->{messages}) {
		$r->json({
			channel  => $target,
			messages => [],
		});
		return;
	}

	my $after   = $r->req->param('after')  || 0;
	my $before  = $r->req->param('before') || $channel->{messages}->[-1]->{time} + 1;
	my $limit   = $r->req->param('limit') || 50;

	unless ($r->req->param('before')) {
		my $res = irssi->call(mark_as_read => $target)->recv;
	}

	my $messages = [
		splice @{[
			reverse
			map {
				my $text = decode_utf8 $_->{text};
				$_->{text} = $text;
				$_;
			}
			grep {
				$_->{time} > $after;
			}
			grep {
				$_->{time} < $before;
			}
			@{ $channel->{messages} }
		]}, 0, $limit
	];

	$r->json({
		channel => $target,
		messages => $messages,
	});
};

route '/api/error', method => POST, action => sub {
	my ($r) = @_;
	$r->require_user or return;
	my $e = $r->req->param('e');
	my $t = $r->req->param('t');
	warn sprintf('%d: %s', $t, $e);
	$r->json({
		status => 'ok'
	});
};

sub uri_for {
	my ($r, $path, $args) = @_;
	$path ||= "";
	my $uri = $r->req->base;
	$uri->path(($r->config->{_}->{root} || '') . $path);
	$uri->query_form(@$args) if $args;
	$uri;
}

sub abs_uri {
	my ($r, $path, $args) = @_;
	$path ||= "";
	my $uri = URI->new($r->config->{_}->{base});
	$uri->path(($r->config->{_}->{root} || '') . $path);
	$uri->query_form(@$args) if $args;
	$uri;
}



sub run {
	my ($env) = @_;
	my $req = Irssw::Request->new($env);
	my $res = $req->new_response;
	my $niro = Irssw->new(
		req => $req,
		res => $res,
	);
	$niro->_run;
}

sub new {
	my ($class, %opts) = @_;
	bless {
		%opts
	}, $class;
}

sub config {
	Irssw::Config->instance;
}

sub _run {
	my ($self) = @_;
	$self->stash(r => $self);
	Irssw::Router->dispatch($self);
	$self->res->finalize;
}

sub req { $_[0]->{req} }
sub res { $_[0]->{res} }
sub log {
	my ($class, $format, @rest) = @_;
	print STDERR sprintf($format, @rest) . "\n";
}

sub stash {
	my ($self, %params) = @_;
	if (%params) {
		$self->{stash} = {
			%{ $self->{stash} || {} },
			%params
		};
	}
	$self->{stash};
}

sub error {
	my ($self, %opts) = @_;
	$self->res->status($opts{code} || 500);
	$self->res->body($opts{message} || $opts{code} || 500);
}

sub session {
	my ($self) = @_;
	$self->{_session} ||= do {
		Plack::Session->require;
		Plack::Session->new($self->req->env);
	};
}

sub user {
	my ($self) = @_;
	if ($self->session->get('authorized')) {
		$self->{_user} ||= Irssw::User->new(
			session_id => $self->req->session_options->{id}
		);
	} else {
		undef;
	}
}

sub require_user {
	my ($self) = @_;
	if ($self->user) {
		1;
	} else {
		$self->res->redirect('/login');
		0;
	}
}

sub require_rks {
	my ($self) = @_;
	my $rks = $self->req->param('rks') || '';
	if ($self->user && $self->user->rks eq $rks) {
		1;
	} else {
		$self->res->code(403);
		0;
	}
}

sub device {
	my ($self) = @_;
	my $b = $self->req->browser;
	$b->is_android and return 'touch';
	$b->is_iphone  and return 'touch';
	$b->is_dsi     and return 'touch';
	$b->is_ipad    and return 'touch';
	$b->is_mobile  and return 'mobile';
	return '';
}

sub version {
	$VERSION
}

sub use_static_shared {
	my ($self) = @_;
	$self->config->{use_static_shared}
}

1;
__END__
=encoding utf8

=head1 NAME

Irssw - IRC web gateway

=head1 SETUP

  cpanm https://github.com/cho45/Plack-Middleware-StaticShared/tarball/master
  cpanm --installdeps .
  ./irssw

=head1 FEATURES

 * 端末ごとの自動ふりわけ
   * タッチデバイス (Android, iPhone, iPad) への対応
   * PC 向けの簡易ビュー (どうしてもSSHを使えない環境とかで使う用)
 * JS による画面制御
   * 体感速度向上
 * 省メモリ
   * HT-03A 程度の端末でもホーム画面が殺されたりしない
 * irssi と連動した未読管理
   * window を移動した際、irssw 側の未読もクリアする

=head1 INTERNAL

 * irssi で直接 UI 用の HTTP サーバをたてない
   * UI 用のウェブサーバは再起動を頻繁にすることが多いので、
     irssi 用のプラグイン部分は最小限構成にしたい
 * UI 用の HTTP サーバと irssi は RPC で通信する
   * 現状は MessagePack RPC

=head1 AUTHOR

cho45 E<lt>cho45@lowreal.netE<gt>

=head1 SEE ALSO

L<App::Mobirc>

=head1 LICENSE

This library is free software; you can redistribute it and/or modify
it under the same terms as Perl itself.

=cut



