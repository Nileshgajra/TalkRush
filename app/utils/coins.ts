import AsyncStorage from '@react-native-async-storage/async-storage';

const COINS_KEY = 'talkrush_coins';

export const getCoins = async (): Promise<number> => {
  const savedCoins = await AsyncStorage.getItem(COINS_KEY);

  if (savedCoins === null) {
    return 0;
  }

  return Number(savedCoins);
};

export const addCoins = async (amount: number): Promise<number> => {
  const currentCoins = await getCoins();
  const newBalance = currentCoins + amount;

  await AsyncStorage.setItem(
    COINS_KEY,
    String(newBalance)
  );

  return newBalance;
};

export const spendCoin = async (): Promise<boolean> => {
  const currentCoins = await getCoins();

  if (currentCoins < 1) {
    return false;
  }

  await AsyncStorage.setItem(
    COINS_KEY,
    String(currentCoins - 1)
  );

  return true;
};