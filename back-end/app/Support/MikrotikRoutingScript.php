<?php

namespace App\Support;

use InvalidArgumentException;

class MikrotikRoutingScript
{
    /**
     * Build MikroTik script to switch routing rules for a specific interface and IP range.
     *
     * @param  string  $interfaceName  Example: "LAN3"
     * @param  string  $plageIp        Example: "192.168.10." or "192.168.10.0/24"
     * @param  string  $switchTo       "Starlink" | "Yas" | "Stop"
     * @return string  MikroTik CLI script
     */
    public static function build(string $interfaceName, string $plageIp, string $switchTo): string
    {
        $interfaceName = trim($interfaceName);
        $plageIp       = trim($plageIp);
        $switchTo      = strtolower(trim($switchTo));

        if ($interfaceName === '' || $plageIp === '') {
            throw new InvalidArgumentException("interfaceName et plageIp sont obligatoires.");
        }

        // Sécurité basique: éviter les guillemets qui cassent le script.
        // (Si tu veux autoriser plus, on peut faire un escape plus strict.)
        if (str_contains($interfaceName, '"') || str_contains($plageIp, '"')) {
            throw new InvalidArgumentException('Caractère invalide (") détecté dans interfaceName ou plageIp.');
        }

        $rules = match ($switchTo) {
            'stop' => [
                'starlink' => 'disable',
                'yas'      => 'disable',
                'noinet'   => 'enable',
            ],
            'starlink' => [
                'starlink' => 'enable',
                'yas'      => 'disable',
                'noinet'   => 'disable',
            ],
            'yas' => [
                'starlink' => 'disable',
                'yas'      => 'enable',
                'noinet'   => 'disable',
            ],
            default => throw new InvalidArgumentException('switchTo doit être: Starlink, Yas, ou Stop.'),
        };

        $interface = $interfaceName;
        $ipRange   = $plageIp;

        // On garde EXACTEMENT ta logique MikroTik
        // return <<<CMD
        // /routing rule
        // {$rules['starlink']} [find comment="{$interface} -> Starlink (MANUAL)"]
        // {$rules['yas']} [find comment="{$interface} -> Yas (MANUAL)"]
        // {$rules['noinet']} [find comment="{$interface} -> NO INTERNET (DEFAULT)"]
        // /ip firewall connection remove [find src-address~"{$ipRange}"]
        // CMD;

        return "/routing rule; "
        . "{$rules['starlink']} [find comment=\"{$interface} -> Starlink (MANUAL)\"]; "
        . "{$rules['yas']} [find comment=\"{$interface} -> Yas (MANUAL)\"]; "
        . "{$rules['noinet']} [find comment=\"{$interface} -> NO INTERNET (DEFAULT)\"]; "
        // . "/ip firewall connection remove [find src-address~\"{$ipRange}\"]"
        ;
    }
}