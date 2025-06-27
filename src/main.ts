import * as rt from './runtime/index';
import App from './App';


rt.run(function* () {
  const appDiv = rt.findReq('#app');
  appDiv.append(App());
  yield;
});

