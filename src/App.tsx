import { useState } from "react";
import { ImageBackground, Text, View } from "react-native";

import BluetoothConnection from "./components/BluetoothConnection";
import CarMove from "./components/CarMove";

import CarIcon from "./assets/carIcon.svg";
import styled from "styled-components/native";

const App = () => {
  const [accelerometerData, setAccelerometerData] = useState<Accelerometer>({
    x: 0,
    y: 0,
  });

  const [isGameStart, setIsGameStart] = useState<boolean>(false);
  const [isCollision, setIsCollision] = useState<boolean>(false);

  if (!isGameStart) {
    return (
      <GameStartContainer>
        <CarIcon width={240} height={240} fill={"#132043"} />
        <GameStartButton onPress={() => setIsGameStart(true)}>
          <Text style={{ fontSize: 24, color: "white" }}>{"게임 시작"}</Text>
        </GameStartButton>
      </GameStartContainer>
    );
  }

  return (
    <View style={{ backgroundColor: "#006400" }}>
      <ImageBackground
        source={require("./assets/backgroundImage.png")}
        style={{ width: "100%", height: "100%" }}
      >
        <BluetoothConnection
          serviceUUID="0000FFE0-0000-1000-8000-00805F9B34FB"
          characteristicUUID="0000FFE1-0000-1000-8000-00805F9B34FB"
          accelerometerData={accelerometerData}
          setAccelerometerData={setAccelerometerData}
          isCollision={isCollision}
        />
        <CarMove
          accelerometerData={accelerometerData}
          isCollision={isCollision}
          setIsCollision={setIsCollision}
        />
      </ImageBackground>
    </View>
  );
};

const GameStartContainer = styled.View`
  flex: 1;
  justify-content: center;
  align-items: center;
  gap: 60px;

  background-color: #fdf0f0;
`;

const GameStartButton = styled.TouchableOpacity`
  padding: 20px 50px;

  border-radius: 20px;

  background-color: #1f4172;
`;

export default App;
