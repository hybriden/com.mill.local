# Mill Local — Homey App

A [Homey](https://homey.app) app that controls **Mill Gen3 heaters** directly over the local network using their built-in REST API — no cloud, no account required.

## Features

- **On/Off control** — turn heaters on or off
- **Target temperature** — set the desired temperature (5 °C – 35 °C, 0.5 °C steps)
- **Current temperature** — read the ambient temperature reported by the heater
- **Local-only** — communicates directly with heaters on your LAN; no internet connection needed
- **Auto-discovery** — scans the local subnet for Mill Gen3 devices during pairing

## Requirements

- Homey (SDK 3, Homey ≥ 5.0)
- Mill Gen3 heater(s) connected to the same local network as Homey
- Node.js ≥ 18 (handled automatically by Homey)

## Installation

Install the app from the [Homey App Store](https://homey.app) or sideload it with the [Homey CLI](https://apps.developer.homey.app/the-basics/getting-started):

```bash
homey app run   # run locally for testing
homey app install  # install on your Homey
```

## Pairing

1. Open the Homey app and go to **Devices → Add Device → Mill Local**.
2. The app scans the `192.168.10.x` subnet (hardcoded) for Mill heaters and lists any it finds.
   > **Note:** Auto-discovery only works if your Mill heaters are on the `192.168.10.0/24` subnet. If your network uses a different range, skip to step 3.
3. Select a discovered device and confirm, **or** add a heater manually by entering its IP address directly.

## Device Settings

| Setting | Description |
|---------|-------------|
| `ip` | IP address of the Mill heater on the local network |

The IP can be updated at any time from the device settings page in Homey if the heater's address changes.

## How It Works

The app communicates with each heater over HTTP on port 80 using the Mill Gen3 local REST API:

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/status` | GET | Discovery probe — checks if a device is a Mill heater |
| `/control-status` | GET | Polls current temperature, target temperature, and operation mode |
| `/operation-mode` | POST | Sets the heater on (`Control individually`) or off (`Off`) |
| `/set-temperature` | POST | Sets the target temperature |

Status is polled every **30 seconds**. If a heater becomes unreachable it is marked as unavailable in Homey and retried on the next poll.

## Project Structure

```
com.mill.local/
├── app.js                        # Homey app entry point
├── app.json                      # App manifest
├── package.json
├── locales/
│   └── en.json                   # English UI strings
└── drivers/
    └── mill-gen3/
        ├── driver.js             # Pairing & device discovery
        ├── device.js             # Per-device capability logic & polling
        ├── driver.compose.json   # Driver manifest
        ├── assets/               # Driver icons
        └── pair/                 # Pairing views
```

## Author

**hybriden**

## License

MIT
