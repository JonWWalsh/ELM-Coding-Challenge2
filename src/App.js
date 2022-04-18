import React from 'react';
import 'bootstrap/dist/css/bootstrap.min.css';
import './App.css';
import axios from 'axios';


function App() {
  return (
    <div className="App">
      <header className="App-header">
        <button onClick={onGetData}>Get Data</button>
        <p>This program tests throttle limits on the API by sending a customizable burst of requests over 'x' period of time and records the limit and how many successful ticket retreivals occured.  The 'Get Data' also functions to initalize single pulls if needed.
        </p>
      </header>
    </div>
  );
  
}

//run until time expires or we hit a rate limit
async function workerThread(onGetData, until) {
  let successfullRequests = 1;
  while(true) {
      const success = await onGetData();
      // only count it if the request was successfull
      // AND finished within the timeframe
      if(success && Date.now() < until) {
          successfullRequests++;
      } else {
          break;
      }
  }
  return successfullRequests;
}

async function testLimit(onGetData, concurency, time) {
  const endTime = Date.now() + time;
  
  // launch "concurency" number of requests
  const workers = [];
  while(workers.length < concurency) {
      workers.push(workerThread(onGetData, endTime));
  }
  
  // sum the number of requests that succeded from each worker.
  // this implicitly waits for them to finish.
  let total = 0;
  for(const worker of workers) {
      total += await worker;
  }
  return total;
}

async function onGetData() {  
  const apiurl = "https://portalapi.elmutility.com";
  const config = {
    headers : {
        'content-type' : 'application/x-www-form-urlencoded'
    }
  };

  const SECRET = encodeURIComponent('YCf3Ax8HkUOCq2cJG8JQDeQ2oe5PUtVMn4V0xMgU6FU='); 
  const CLIENT_ID = 'CODETEST2';
  const requestStr = `client_secret=${SECRET}&grant_type=client_credentials&client_id=${CLIENT_ID}`;

  // Authenticate
  axios.post(apiurl+"/token", requestStr, config)
  .then(res => {
    const token = res.data.access_token;
    console.log('token', token);
    // debugger;

    if (token.length === 0) {
      alert('authentication failed');
    }
    // If we get here, auth was successful. Go get ticket data.
    getTicketData(apiurl, token);
    // return apiurl.ok;
  })
  .catch(err => {
    console.error(err);
    alert('error authenticating');
    // debugger;
  })
  return false;
}

function getTicketData(apiurl, accessToken) {  
  const config = {
    headers : {
      'content-type' : 'application/json',
      'authorization' : 'Bearer ' + accessToken
    }
  };

  const queryStr = "/api/ticketquery/getcustomertickets?startDateTimeUtc=2022-04-11T10:00:00&endDateTimeUtc=2022-04-11T18:00:00&queryType=CreationDate";
  axios.get(apiurl+queryStr, config)
  .then(res => {
    console.log(`Retrieved ${res.data.length} tickets`);
    alert(`Success. Retrieved ${res.data.length} tickets.`)
    // Use global for sample app expediency
    return res.ok;
    // debugger;
  })
  .catch(err => {
    console.error(err);    
    alert(err.message + ' ' + err.response.data);
  });
}

(async function() {
  // run x requests at a time for x seconds to determine throttle limit
  const limit = await testLimit(onGetData, 11, 60*1000);
  console.log("limit is " + limit + " requests in 60 seconds");
})();
// On code execution we see the total number of successfull ticket retreivals (in this case 10) before we get the 429 error code.  We can then adjust the timing in order to determine the span in which we can send the requests.

export default App;
