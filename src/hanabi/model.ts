type Log = {};
type Handler<Event> = (e: Event) => Promise<any>;
type Controller = Handler<Log>;

class Model {
  ctrl: Controller;
  view: GameView;

  constructor(ctrl: Controller, view: GameView) {
    this.ctrl = ctrl;
    this.view = view;
  }

  log(e: Log): AsyncGenerator<Log> {
    // must not use this.emit
    return null as any;
  }

  // possible moves
  dropCard(index: number) {}
  playCard(index: number) {}
  giveAdvice(user: number, type: AdviceType) {}
}
