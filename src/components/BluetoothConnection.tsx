import { useCallback, useEffect, useState } from "react";
import { View, Text, Platform, PermissionsAndroid } from "react-native";
import { BleManager, Characteristic, Device } from "react-native-ble-plx";
import base64 from "base-64";

interface BluetoothAccelerometerProps {
  serviceUUID: string;
  characteristicUUID: string;
  accelerometerData: Accelerometer;
  setAccelerometerData: React.Dispatch<React.SetStateAction<Accelerometer>>;
  isCollision: boolean;
}

// BleManager 인스턴스는 한 프로젝트에 하나만 존재해야된다.
// BLE 기능이 필요하지 않은 경우 manager.destroy() 함수를 호출하여 생성된 인스턴스를 삭제할 수 있다.
export const manager = new BleManager();

const BluetoothAccelerometer = ({
  serviceUUID,
  characteristicUUID,
  accelerometerData,
  setAccelerometerData,
  isCollision,
}: BluetoothAccelerometerProps) => {
  const [device, setDevice] = useState<Device | null>(null);
  const [characteristic, setCharacteristic] = useState<Characteristic>();

  // Bluetooth 권한 요청 함수
  const requestBluetoothPermission = useCallback(async () => {
    if (Platform.OS === "ios") {
      return true; // iOS에서는 권한 요청이 필요 없음
    }

    if (Platform.OS === "android") {
      const apiLevel = Platform.Version;

      if (apiLevel < 31) {
        try {
          // Android API 레벨이 31 미만인 경우 위치 권한 요청
          const granted = await PermissionsAndroid.request(
            PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION
          );
          return granted === PermissionsAndroid.RESULTS.GRANTED;
        } catch (error) {
          console.error("Bluetooth 권한 요청 중 에러:", error);
          return false;
        }
      } else {
        try {
          // Android API 레벨이 31 이상인 경우 여러 권한 요청
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
        } catch (error) {
          console.error("Bluetooth 권한 요청 중 에러:", error);
          return false;
        }
      }
    }

    return false;
  }, []);

  // 블루투스 모듈에서 가속도계 탐색 및 연결 함수
  const connectToAccelerometer = useCallback(
    async (connectedDevice: Device) => {
      try {
        // 서비스 검색
        await connectedDevice.discoverAllServicesAndCharacteristics();

        const services = await connectedDevice.services();
        const service = services.find(
          (s) => s.uuid.toLowerCase() === serviceUUID.toLowerCase()
        );

        if (!service) {
          console.error(`서비스 ${serviceUUID}을 장치에서 찾을 수 없습니다.`);
          return;
        }

        const characteristics = await service.characteristics();
        const foundCharacteristic = characteristics.find(
          (c) => c.uuid.toLowerCase() === characteristicUUID.toLowerCase()
        );

        if (!foundCharacteristic) {
          console.error(
            `특성 ${characteristicUUID}을 장치에서 찾을 수 없습니다.`
          );
          return;
        }

        setCharacteristic(foundCharacteristic);
      } catch (error) {
        console.error("가속도계 구독 실패", error);
      }
    },
    [characteristicUUID, serviceUUID]
  );

  const sendBluetoothData = useCallback(
    async (data: boolean) => {
      if (!characteristic) {
        return;
      }

      try {
        // 데이터를 문자열로 변환 후 HM-10 모듈로 전송
        await characteristic.writeWithResponse(base64.encode(data ? "1" : "0"));
      } catch (writeError) {
        console.error("HM-10 모듈에 데이터 쓰기 실패:", writeError);
      }
    },
    [characteristic]
  );

  // 장치 연결 함수
  const connectToDevice = useCallback(
    async (selectedDevice: Device) => {
      try {
        const connectedDevice = await selectedDevice.connect();

        console.log("장치가 연결되었습니다.");

        setDevice(connectedDevice);
        connectToAccelerometer(connectedDevice);
      } catch (error) {
        console.error("Bluetooth 장치와의 연결 실패:", error);
      }
    },
    [connectToAccelerometer]
  );

  // BLE 장치 스캔 함수
  const startDeviceScan = useCallback(() => {
    manager.startDeviceScan(null, null, async (error, scannedDevice) => {
      if (error) {
        console.error("Bluetooth 장치 스캔 중 에러:", error);
        return;
      }

      if (scannedDevice?.name === "ControlCar") {
        manager.stopDeviceScan();
        connectToDevice(scannedDevice);
      }
    });
  }, [connectToDevice]);

  useEffect(() => {
    // Bluetooth 권한 요청 및 BLE 스캔 시작
    requestBluetoothPermission();
    startDeviceScan();

    // 컴포넌트 언마운트 시 정리 작업
    return () => {
      manager.stopDeviceScan();
      if (device) {
        device.cancelConnection();
      }
    };
  }, [device, requestBluetoothPermission, startDeviceScan]);

  // 블루투스 모듈로부터 수신받은 데이터 구독
  useEffect(() => {
    if (!characteristic) {
      return;
    }

    let incompleteData = "";

    // 특성 모니터링
    characteristic.monitor((error, foundCharacteristic) => {
      if (error) {
        console.error("특성 구독 실패", error);
        return;
      }

      const data = foundCharacteristic?.value; // Bluetooth로부터 수신한 데이터
      if (data) {
        try {
          const decodedData = base64.decode(data);
          const completeData = incompleteData + decodedData;

          // 데이터가 완전한 JSON 형식인지 확인
          if (completeData.includes("}")) {
            const { x, y } = JSON.parse(completeData);
            setAccelerometerData({ x, y });
            incompleteData = ""; // 초기화
          } else {
            // 데이터가 완전하지 않으면 incompleteData에 저장
            incompleteData = completeData;
          }
        } catch (parseError) {
          console.error("JSON 파싱 실패", parseError);
        }
      }
    });
  }, [characteristic, setAccelerometerData]);

  useEffect(() => {
    sendBluetoothData(isCollision);
  }, [isCollision, sendBluetoothData]);

  // 화면에 가속도 데이터 출력
  return (
    <View>
      <Text style={{ color: "white" }}>X: {accelerometerData.x}</Text>
      <Text style={{ color: "white" }}>Y: {accelerometerData.y}</Text>
    </View>
  );
};

export default BluetoothAccelerometer;
