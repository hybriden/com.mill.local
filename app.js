'use strict';

const Homey = require('homey');

class MillLocalApp extends Homey.App {
  async onInit() {
    this.log('Mill Local app started');
  }
}

module.exports = MillLocalApp;
