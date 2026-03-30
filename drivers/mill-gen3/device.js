'use strict';

const Homey = require('homey');
const http = require('http');

const POLL_INTERVAL_MS = 30000;
const REQUEST_TIMEOUT_MS = 5000;

class MillGen3Device extends Homey.Device {

  async onInit() {
    this.log(`Mill device init: ${this.getName()} @ ${this.getSetting('ip')}`);

    this.registerCapabilityListener('onoff', this._onSetOnOff.bind(this));
    this.registerCapabilityListener('target_temperature', this._onSetTargetTemperature.bind(this));

    await this._poll();
    this._pollInterval = this.homey.setInterval(this._poll.bind(this), POLL_INTERVAL_MS);
  }

  async onDeleted() {
    this.homey.clearInterval(this._pollInterval);
  }

  async onSettings({ newSettings }) {
    if (newSettings.ip) {
      this.log(`IP updated to ${newSettings.ip}`);
    }
  }

  async _poll() {
    try {
      const status = await this._get('/control-status');
      await this.setCapabilityValue('measure_temperature', status.ambient_temperature);
      await this.setCapabilityValue('target_temperature', status.set_temperature);
      await this.setCapabilityValue('onoff', status.operation_mode !== 'OFF');
      if (!this.getAvailable()) await this.setAvailable();
    } catch (err) {
      this.error(`Poll failed: ${err.message}`);
      await this.setUnavailable(`Unreachable: ${err.message}`);
    }
  }

  async _onSetOnOff(value) {
    await this._post('/operation-mode', { mode: value ? 'Control individually' : 'Off' });
  }

  async _onSetTargetTemperature(value) {
    await this._post('/set-temperature', { type: 'Normal', value });
  }

  _get(path) {
    const ip = this.getSetting('ip');
    return new Promise((resolve, reject) => {
      const req = http.get(
        { host: ip, port: 80, path, timeout: REQUEST_TIMEOUT_MS },
        (res) => {
          let body = '';
          res.on('data', chunk => { body += chunk; });
          res.on('end', () => {
            try {
              const json = JSON.parse(body);
              if (json.status !== 'ok') reject(new Error(`API error: ${body}`));
              else resolve(json);
            } catch (e) {
              reject(new Error(`Invalid JSON: ${body}`));
            }
          });
        }
      );
      req.on('error', reject);
      req.on('timeout', () => { req.destroy(); reject(new Error('Request timed out')); });
    });
  }

  _post(path, body) {
    const ip = this.getSetting('ip');
    const payload = JSON.stringify(body);
    return new Promise((resolve, reject) => {
      const req = http.request(
        {
          host: ip,
          port: 80,
          path,
          method: 'POST',
          timeout: REQUEST_TIMEOUT_MS,
          headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(payload)
          }
        },
        (res) => {
          let data = '';
          res.on('data', chunk => { data += chunk; });
          res.on('end', () => {
            try {
              const json = JSON.parse(data);
              if (json.status !== 'ok') reject(new Error(`API error: ${data}`));
              else resolve(json);
            } catch (e) {
              reject(new Error(`Invalid JSON: ${data}`));
            }
          });
        }
      );
      req.on('error', reject);
      req.on('timeout', () => { req.destroy(); reject(new Error('Request timed out')); });
      req.write(payload);
      req.end();
    });
  }

}

module.exports = MillGen3Device;
