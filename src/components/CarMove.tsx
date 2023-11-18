import { useCallback, useEffect, useState } from "react";
import { Dimensions } from "react-native";
import Sound from "react-native-sound";
import Toast from "react-native-toast-message";

import styled from "styled-components/native";

import GrassIcon from "../assets/grassIcon.svg";
import FlowerIcon from "../assets/flowerIcon.svg";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

interface CarMoveProps {
  accelerometerData: Accelerometer;
  isCollision: boolean;
  setIsCollision: React.Dispatch<React.SetStateAction<boolean>>;
}

const CarMove = ({
  accelerometerData,
  isCollision,
  setIsCollision,
}: CarMoveProps) => {
  // 자동차 이미지의 위치를 관리하기 위한 상태 변수
  const [position, setPosition] = useState<Accelerometer>({ x: 0, y: 0 });

  // 여러 장애물을 관리하는 상태 변수
  const [grasses, setGrasses] = useState<any[]>([]);
  const [flowers, setFlowers] = useState<any[]>([]);

  useEffect(() => {
    // 여기서 accelerometerData의 x와 y 값을 기반으로 자동차 이미지의 위치를 업데이트
    // accelerometerData는 블루투스 컨트롤러의 가속도 값
    const newX = position.x - accelerometerData.x; // 가로 방향으로 이동
    const newY = position.y + accelerometerData.y; // 세로 방향으로 이동

    // 컨테이너를 벗어나지 않도록 위치를 제한하는 코드
    const maxX = SCREEN_WIDTH / 2 - 50; // 50은 자동차의 너비의 절반
    const maxY = SCREEN_HEIGHT / 2 - 50; // 50은 자동차의 높이의 절반

    const minX = -SCREEN_WIDTH / 2 + 50;
    const minY = -SCREEN_HEIGHT / 2 + 50;

    // 경계 내에서만 위치를 업데이트
    const updatedX = Math.max(minX, Math.min(newX, maxX));
    const updatedY = Math.max(minY, Math.min(newY, maxY));

    // 벽과 충돌 여부 확인
    setIsCollision(
      updatedX === minX ||
        updatedX === maxX ||
        updatedY === minY ||
        updatedY === maxY
    );

    setPosition({ x: updatedX, y: updatedY });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accelerometerData]);

  // 장애물 추가 함수
  const addDecoration = useCallback(
    (numberOfDecoration: number) => {
      const newGrasses = Array.from({ length: numberOfDecoration }, () => ({
        left: Math.random() * (SCREEN_WIDTH - 50),
        top: Math.random() * (SCREEN_HEIGHT - 50),
      }));

      const newFlowers = Array.from({ length: numberOfDecoration }, () => ({
        left: Math.random() * (SCREEN_WIDTH - 50),
        top: Math.random() * (SCREEN_HEIGHT - 50),
      }));

      setGrasses((prevGrasses) => [...prevGrasses, ...newGrasses]);
      setFlowers((prevFlowers) => [...prevFlowers, ...newFlowers]);
    },
    [setGrasses]
  );

  useEffect(() => {
    addDecoration(10);
  }, [addDecoration]);

  useEffect(() => {
    if (isCollision) {
      const music: any = new Sound("beep.mp3", Sound.MAIN_BUNDLE, (error) => {
        if (error) {
          console.log("Error loading sound: " + error);
          return;
        }
      });
      // 충돌이 감지되면 비프음을 냄
      music.play();

      console.log("충돌!");

      Toast.show({
        type: "info",
        position: "bottom", // 토스트 메시지 위치 (top, bottom)
        text1: "충돌!", // 메시지 제목
        text2: "자동차가 화면 끝에 닿았습니다!", // 메시지 내용
        visibilityTime: 1000, // 토스트 메시지 표시 시간 (밀리초)
      });
    }
  }, [isCollision]);

  return (
    <Container>
      <Car
        source={require("../assets/car.png")}
        style={{
          left: SCREEN_WIDTH / 2 - 50 + position.x,
          top: SCREEN_HEIGHT / 2 - 50 + position.y,
        }}
      />
      {/* 장애물 컴포넌트들을 매핑하여 렌더링 */}
      {grasses.map((grass, index) => (
        <GrassIcon
          key={index}
          style={{
            left: grass.left,
            top: grass.top,
            width: grass.width,
            height: grass.height,
          }}
          width={40}
          height={40}
          fill="black"
        />
      ))}
      {flowers.map((flower, index) => (
        <FlowerIcon
          key={index}
          style={{
            left: flower.left,
            top: flower.top,
            width: flower.width,
            height: flower.height,
          }}
          width={40}
          height={40}
          fill="#FA7070"
        />
      ))}
    </Container>
  );
};

const Container = styled.View`
  flex: 1;

  background-color: transparent;
`;

const Car = styled.Image`
  position: absolute;
  width: 100px;
  height: 100px;
`;

export default CarMove;
