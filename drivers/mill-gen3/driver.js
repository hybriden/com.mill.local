'use strict';

const Homey = require('homey');
const http = require('http');

const SCAN_TIMEOUT_MS = 2000;
const SCAN_CONCURRENCY = 20;

class MillGen3Driver extends Homey.Driver {

  async onInit() {
    this.log('Mill Gen3 driver initialized');
  }

  async onPair(session) {
    session.setHandler('list_devices', async () => {
      return this._discoverDevices();
    });

    session.setHandler('manual_add', async ({ ip, name }) => {
      const device = await this._probeDevice(ip);
      if (!device) throw new Error(`Could not reach Mill heater at ${ip}`);
      return {
        name: name || device.custom_name || device.name || `Mill ${ip}`,
        data: { id: device.mac_address },
        settings: { ip }
      };
    });
  }

  async _discoverDevices() {
    const subnet = '192.168.10';
    const discovered = [];
    const ips = Array.from({ length: 254 }, (_, i) => `${subnet}.${i + 1}`);

    // Process in batches to avoid flooding the network
    for (let i = 0; i < ips.length; i += SCAN_CONCURRENCY) {
      const batch = ips.slice(i, i + SCAN_CONCURRENCY);
      const results = await Promise.all(batch.map(ip =>
        this._probeDevice(ip).then(info => (info ? { ip, info } : null))
      ));
      for (const result of results) {
        if (!result) continue;
        const { ip, info } = result;
        if (!info.name || !info.name.toLowerCase().includes('mill')) continue;
        discovered.push({
          name: info.custom_name || info.name || `Mill ${ip}`,
          data: { id: info.mac_address },
          settings: { ip }
        });
      }
    }

    return discovered;
  }

  async _probeDevice(ip) {
    return new Promise((resolve) => {
      const req = http.get(
        { host: ip, port: 80, path: '/status', timeout: SCAN_TIMEOUT_MS },
        (res) => {
          let body = '';
          res.on('data', chunk => { body += chunk; });
          res.on('end', () => {
            try {
              const json = JSON.parse(body);
              resolve(json.status === 'ok' ? json : null);
            } catch {
              resolve(null);
            }
          });
        }
      );
      req.on('error', () => resolve(null));
      req.on('timeout', () => { req.destroy(); resolve(null); });
    });
  }

}

module.exports = MillGen3Driver;
