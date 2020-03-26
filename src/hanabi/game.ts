enum AdviceType {
  Color,
  Number,
}
type Color = number;
type Card = {
  color: Color | null;
  number: number | null;
};

interface BeginGame {
  name: "BeginGame";
}
interface EndTurn {
  name: "BeginTurn";
  user: number;
}
interface BeginTurn {
  name: "BeginTurn";
  user: number;
}
interface DropCard {
  name: "DropCard";
  user: number;
  index: number;
}
interface DrawCard {
  name: "DrawCard";
  user: number;
  card: Card;
}
interface PlayCard {
  name: "PlayCard";
  user: number;
  index: number;
}

type GameEvent =
  | BeginGame
  | EndTurn
  | BeginTurn
  | DropCard
  | DrawCard
  | PlayCard;

class GameView {
  async beginGame() {}
  async endGame() {}

  async beginTurn(user: number) {}
  async endTurn(user: number) {}
  async beginMyTurn() {}
  async endMyTurn() {}

  async dropCard(user: number, index: number) {}
  async drawCard(user: number, card: Card) {}
  async playCardOkay(user: number, index: number, card: Card) {}
  async playCardMistake(user: number, index: number, card: Card) {}

  async provideInformation(from: number, to: number, info: Map<number, Card>) {}
}
