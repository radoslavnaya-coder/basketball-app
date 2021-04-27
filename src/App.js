import { version, Component } from 'inferno';
import Logo from './logo';
import GameScene from './game';
import'./App.css';
import bridge from '@vkontakte/vk-bridge';


class App extends Component {
  constructor(){
    super();
    this.state = {
      score: 0,
      muted: false
    };
    this.url = new URLSearchParams(window.location.search);

    
 
    // console.log(this.scene);
  }
  initGame() {
    if (this.scene){
    this.scene.dispose();
    this.scene = null;
    }

    this.scene = new GameScene(this.canvas, 
            () => {    
              
              // bridge.send("VKWebAppCallAPIMethod", {"method": "secure.getUserLevel", "request_id": "001", "params": {"user_ids": [this.url.get('user_id')], "v":"5.130", "access_token": this.url.get('access_token')}})
              // .then(data => console.log(data))
              
              if (this.state.score>0) {
                bridge.send("VKWebAppCallAPIMethod", {"method": "secure.addAppEvent", "request_id": "001", "params": {"user_id": this.url.get('user_id'), "v":"5.130","activity_id":2,"value": this.state.score, "access_token": "904409a9904409a9904409a9919033044699044904409a9f0188b975d1c1f7b467d2160", "client_secret":this.url.get('access_token')}});
                bridge.send("VKWebAppShowLeaderBoardBox", {user_result:this.state.score})
         .then(data => this.restartGame())
        .catch(error => console.log(error));  
                bridge.send("VKWebAppShowNativeAds", {ad_format:"preloader"})
                .then(data => this.restartGame())
                .catch(error => console.log(error));
               
            } else{
              this.scene.dispose();
            }

          },
          () => {
            this.scene.score+=1;
            this.setState({
              score: this.state.score + 1,
            });
          }
          );
    this.scene.loop();
    window.addEventListener("resize",() =>{this.scene._engine.resize(); });
   }

   showLearderBoard(data){
       
   }

   restartGame(){
    this.scene.gameStart()
     this.setState({
              score: 0,
            });
    this.scene.score = 0;
    this.scene.dispose();
    
   };
 
  componentDidMount(){
    bridge.send("VKWebAppInit");
    this.initGame();
  }




  render() {
    // const opts = {};
    return (
      <div className="page">  
      
      <h1 id = "score" className = "score">{this.state.score}</h1>
        <h1 id="descr" className="description">Используй свой палец, чтобы забросить мяч в корзину</h1>
        <div class="page__button">
          <a src="#">
            <img class="page__button-pause" src="/svgs/pause.png" />
            </a>
            <a src="#">
            <img class="page__button-mute" src="/svgs/mute2.png" />
            <img class="page__button-mute" src="/svgs/mute.png" />
          </a>
        </div>
        
      <img id = "pointer" className = "pointer" src="/svgs/decree.png"/>

      <canvas
          id="game" 
          className="game"
          pointer-events = "none"
          ref={canvas => this.canvas = canvas}/>
      <button id = "go" id="pointer" className = "start" onClick={()=>{
                  this.scene.gameStart();
                  document.getElementById("go").style.opacity = 0;
                  document.getElementById("descr").style.opacity = 0;
                   document.getElementById("score").style.opacity = 100;
                  }}>Поехали!</button>
      </div>
    );
  }
}

export default App;
