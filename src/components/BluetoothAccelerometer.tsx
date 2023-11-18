import { useEffect, useState } from "react";
import { View, Text, Platform, PermissionsAndroid } from "react-native";
import { BleManager, Device } from "react-native-ble-plx";

interface Accelerometer {
  x: number;
  y: number;
}

interface BluetoothAccelerometerProps {
  serviceUUID: string;
  characteristicUUID: string;
}

// BleManager 인스턴스는 한 프로젝트에 하나만 존재해야된다.
// BLE 기능이 필요하지 않은 경우 manager.destroy() 함수를 호출하여 생성된 인스턴스를 삭제할 수 있다.
// 그런 다음 나중에 BleManager 인스턴스를 다시 만들 수 있다.
export const manager = new BleManager();

const BluetoothAccelerometer = ({
  serviceUUID,
  characteristicUUID,
}: BluetoothAccelerometerProps) => {
  const [accelerometerData, setAccelerometerData] =
    useState<Accelerometer | null>(null);
  const [device, setDevice] = useState<Device | null>(null);

  useEffect(() => {
    const requestBluetoothPermission = async () => {
      if (Platform.OS === "ios") {
        return true; // iOS에서는 권한 요청이 필요 없습니다.
      }

      if (Platform.OS === "android") {
        const apiLevel = Platform.Version;

        if (apiLevel < 31) {
          // Android API 레벨이 31 미만인 경우
          const granted = await PermissionsAndroid.request(
            PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION
          );
          return granted === PermissionsAndroid.RESULTS.GRANTED;
        } else {
          // Android API 레벨이 31 이상인 경우
          const result = await PermissionsAndroid.requestMultiple([
            PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
            PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
            PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
          ]);

          return (
            result["android.permission.BLUETOOTH_CONNECT"] ===
              PermissionsAndroid.RESULTS.GRANTED &&
            result["android.permission.BLUETOOTH_SCAN"] ===
              PermissionsAndroid.RESULTS.GRANTED &&
            result["android.permission.ACCESS_FINE_LOCATION"] ===
              PermissionsAndroid.RESULTS.GRANTED
          );
        }
      }

      // showErrorToast("Permission have not been granted");

      return false;
    };

    const startDeviceScan = () => {
      manager.startDeviceScan(null, null, (error, scannedDevice) => {
        if (error) {
          console.error("Bluetooth 장치 스캔 중 에러:", error);
          return;
        }

        if (scannedDevice?.name === "Magical_Car") {
          manager.stopDeviceScan();
          connectToDevice(scannedDevice);
        }
      });
    };

    const connectToDevice = (selectedDevice: Device) => {
      selectedDevice
        .connect()
        .then((connectedDevice) => {
          setDevice(connectedDevice);
          subscribeToAccelerometer(connectedDevice);
        })
        .catch((error) => {
          console.error("Bluetooth 장치와의 연결 실패:", error);
        });
    };

    // eslint-disable-next-line @typescript-eslint/no-shadow
    const subscribeToAccelerometer = (device: Device) => {
      device
        .services()
        .then((services) => {
          const service = services.find((s) => s.uuid === serviceUUID);
          if (!service) {
            console.error(`서비스 ${serviceUUID}을 장치에서 찾을 수 없습니다.`);
            return;
          }

          service
            .characteristics()
            .then((characteristics) => {
              const characteristic = characteristics.find(
                (c) => c.uuid === characteristicUUID
              );
              if (!characteristic) {
                console.error(
                  `특성 ${characteristicUUID}을 장치에서 찾을 수 없습니다.`
                );
                return;
              }

              // eslint-disable-next-line @typescript-eslint/no-shadow
              characteristic.monitor((error, characteristic) => {
                if (error) {
                  console.error("특성 구독 실패", error);
                  return;
                }

                const data = characteristic?.value; // Bluetooth로부터 수신한 데이터
                if (data) {
                  // 문자열을 Uint8Array로 변환
                  const dataBytes = new TextEncoder().encode(data);
                  const [x, y] = dataBytes;
                  setAccelerometerData({ x, y });
                }
              });
            })
            .catch((error) => {
              console.error("특성 조회 실패", error);
            });
        })
        .catch((error) => {
          console.error("서비스 조회 실패", error);
        });
    };

    requestBluetoothPermission();
    startDeviceScan();

    return () => {
      manager.stopDeviceScan();
      if (device) {
        device.cancelConnection();
      }
    };
  }, [serviceUUID, characteristicUUID, device]);

  return (
    <View>
      {accelerometerData ? (
        <View>
          <Text>X: {accelerometerData.x}</Text>
          <Text>Y: {accelerometerData.y}</Text>
        </View>
      ) : (
        <Text>가속도 데이터를 수신 중이 아닙니다.</Text>
      )}
    </View>
  );
};

export default BluetoothAccelerometer;
