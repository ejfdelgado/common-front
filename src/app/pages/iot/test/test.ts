import { Component } from '@angular/core';

@Component({
  selector: 'app-test',
  imports: [],
  templateUrl: './test.html',
  styleUrl: './test.scss',
})
export class TestIoT {

  async connect() {
    if (!navigator.bluetooth) {
      console.error('Web Bluetooth API not available. Requires HTTPS and a supported browser.');
      return;
    }
    try {
      const device = await navigator.bluetooth.requestDevice({
        acceptAllDevices: true,
        optionalServices: ['battery_service']
      });

      if (!device.gatt) {
        return;
      }

      const server = await device.gatt.connect();

      const service = await server.getPrimaryService('battery_service');
      const characteristic =
        await service.getCharacteristic('battery_level');

      const value = await characteristic.readValue();

      console.log('Battery:', value.getUint8(0) + '%');
    } catch (err) {
      console.error(err);
    }
  }

  async listAvailableDevices(): Promise<BluetoothDevice[]> {
    if (!navigator.bluetooth) {
      console.error('Web Bluetooth API not available. Requires HTTPS and a supported browser.');
      return [];
    }
    try {
      const devices = await navigator.bluetooth.getDevices();
      if (devices.length === 0) {
        console.log('No previously permitted devices found. Call connect() first to pair a device.');
      } else {
        devices.forEach(d => console.log(`Device: ${d.name ?? '(unnamed)'} [id: ${d.id}]`));
      }
      devices.forEach((device) => {
        console.log(device);
      });
      return devices;
    } catch (err) {
      console.error(err);
      return [];
    }
  }
}
