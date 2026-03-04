<?php

namespace App\Services;

use phpseclib3\Net\SSH2;

class MikrotikService
{
    private $ssh;

    public function connect()
    {
        $host = config('mikrotik.host');
        $port = config('mikrotik.port');
        $user = config('mikrotik.user');
        $pass = config('mikrotik.pass');

        $this->ssh = new SSH2($host, $port);

        if (!$this->ssh->login($user, $pass)) {
            throw new \Exception('SSH Login Failed');
        }

        return $this;
    }

    public function exec($command)
    {
        if (!$this->ssh) {
            $this->connect();
        }

        return $this->ssh->exec($command);
    }
}