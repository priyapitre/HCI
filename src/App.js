import React, { useState, useRef } from "react";
import { Button, Container, Tabs, Tab, Modal } from "react-bootstrap";
import 'bootstrap/dist/css/bootstrap.min.css';
import OpenAI from "openai";


const PARAMS = {
  temperature: 0.9,
  max_tokens: 2048,
}

const openai = new OpenAI({
  apiKey: process.env.REACT_APP_OPENAI_KEY,
  dangerouslyAllowBrowser: true
});


function App() {
  const [questionType, setQuestionType] = useState('argumentation');
  const [userInput, setUserInput] = useState('');
  const [highlightedUserInput, setHighlightedUserInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [counterArguments, setCounterArguments] = useState([]);
  const [counterArgumentResponses, setCounterArgumentResponses] = useState([]);
  const [showChatBox, setShowChatBox] = useState(false);
  const [showDebateBox, setShowDebateBox] = useState(false); // State for debate input box visibility
  const [chatMessages, setChatMessages] = useState([]);
  const [debateMessages, setDebateMessages] = useState([]);
  const [showExtraContextButton, setShowExtraContextButton] = useState(false);
  const [highlightModalOpen, setHighlightModalOpen] = useState(false);
  const [highlightedText, setHighlightedText] = useState('');
  const [highlightedResponse, setHighlightedResponse] = useState('');
  const [showExtraContextPopup, setShowExtraContextPopup] = useState(false);
  const [extraContext, setExtraContext] = useState('');
  const userInputRef = useRef(null);
  const debateInputRef = useRef(null);
  const [assistantResponses, setAssistantResponses] = useState([]);
  const [userReactions, setUserReactions] = useState([]);
  const [assistantPreviousResponse, setAssistantPreviousResponse] = useState('');


  const getInstructions = (qt, input) => {
    let prompt;
    switch (qt) {
      case 'argumentation':
        prompt = `Argdec is a chatbot that detects claims in a news article and returns them as it is. Here is the news article: ${input}`;
        break;
      default:
        prompt = '';
    }
    return prompt;
  };

  const handleHighlightText = () => {
    const selectedText = window.getSelection().toString();
    if (selectedText) {
      setHighlightedText(selectedText);
      setHighlightModalOpen(true);
    }
  };

  const handleSendHighlightedText = async () => {
    const prompt = `Here is a highlighted text by me: ${highlightedText}. If it's one word, provide its definition. If it's more than that, use your knowledge to give context about that to me. Be under 200 words.`;

    try {
      const endpoint = "https://api.openai.com/v1/chat/completions";
      const body = {
        model: "gpt-3.5-turbo-0613",
        messages: [{ role: "user", content: prompt }],
        ...PARAMS,
      };

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.REACT_APP_OPENAI_KEY}`
        },
        body: JSON.stringify(body)
      });

      const data = await response.json();
      const aiResponse = data.choices[0].message.content.trim();

      setHighlightedResponse(aiResponse);
      setHighlightModalOpen(false);
    } catch (error) {
      console.error("Error:", error);
    }
  };


  const removePunctuationAtEnd = (text) => {
    return text.replace(/([^\s\w]|_)+(?=\s*$)/g, '');
  };

  const handleSendData = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    const prompt = getInstructions(questionType, userInput);
    const endpoint = "https://api.openai.com/v1/chat/completions";
    const body = {
      model: "ft:gpt-3.5-turbo-1106:virginia-tech::8wKEVp70",
      messages: [{ role: "user", content: prompt }],
      ...PARAMS,
    };

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.REACT_APP_OPENAI_KEY}`
      },
      body: JSON.stringify(body)
    });

    const data = await response.json();
    const cbResponseContent = data.choices[0].message.content;
    setIsLoading(false);
    setSubmitted(true);

    const cleanedResponse = cbResponseContent.replace(/\d+\./g, '').split(/[.,!?;]/).map(str => str.trim()).filter(str => str.length > 0);

    let highlightedInput = userInput;
    cleanedResponse.forEach(response => {
      const processedResponse = removePunctuationAtEnd(response.trim());
      if (userInput.includes(processedResponse)) {
        highlightedInput = highlightedInput.replace(new RegExp(processedResponse, "gi"), `<span style="background-color: yellow;">${response}</span>`);
      }
    });
    setHighlightedUserInput(highlightedInput);

    const counterArguments = [];
    const counterArgumentResponses = [];

    for (const argument of cleanedResponse) {
      const secondBody = {
        model: "gpt-3.5-turbo-0613",
        messages: [{ role: "user", content: `For the following argument: ${argument} generate a brief but persuasive counterargument. Think about latest events, historical events, and other things you know and answer accordingly. Don't use the same example again and again, use a variety of ideas. Do not exceed 200 words.` }],
        ...PARAMS,
      };

      const secondResponse = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.REACT_APP_OPENAI_KEY}`
        },
        body: JSON.stringify(secondBody)
      });

      const secondData = await secondResponse.json();
      const counterArgumentResponse = secondData.choices[0].message.content;
      counterArguments.push(argument);
      counterArgumentResponses.push(counterArgumentResponse);
    }

    setCounterArguments(counterArguments);
    setCounterArgumentResponses(counterArgumentResponses);

    setShowChatBox(true);
    setShowExtraContextButton(true);
  }

  const handleSendChatMessage = async () => {
    const messageInput = document.getElementById("message-input").value;
    const endpoint = "https://api.openai.com/v1/chat/completions";
    const body = {
      model: "gpt-3.5-turbo-0613",
      messages: [
        { role: "user", content: messageInput },
        { role: "assistant", content: `You are an assistant for question-answering tasks. This is some context: ${userInput}. Based on the context, answer this question: Question: According to the author, ${messageInput}.` }
      ],
      ...PARAMS,
    };

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.REACT_APP_OPENAI_KEY}`
      },
      body: JSON.stringify(body)
    });

    const data = await response.json();
    const aiResponse = data.choices[0].message.content;

    setChatMessages([...chatMessages, { role: "user", content: messageInput}, { role: "assistant", content: aiResponse }]);
    //setAssistantResponses([...assistantResponses, aiResponse]);
  };

  // Function to handle getting extra context
  const handleExtraContext = async () => {
    const endpoint = "https://api.openai.com/v1/chat/completions";
    const body = {
      model: "gpt-3.5-turbo-0613",
      messages: [{ role: "user", content: `Here is an article: ${userInput}. First provide a summary of the article in 2 lines. Then based on whatever you know about the topic, generate additional context that would be useful for the user to get context on the article. Do not use things from the article for the context. Use external knowledge you have about recent events, historical events, etc to put out a context. Overall, do not exceed 200 words under any condition.` }],
      ...PARAMS,
    };

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.REACT_APP_OPENAI_KEY}`
        },
        body: JSON.stringify(body)
      });

      const data = await response.json();
      const aiResponse = data.choices[0].message.content;

      setExtraContext(aiResponse);
      setShowExtraContextPopup(true);
    } catch (error) {
      console.error("Error:", error);
    }
  };

  // Function to toggle debate box visibility
// Function to toggle debate box visibility
const handleToggleDebateBox = () => {
  if (showDebateBox) {
    // Clear debate messages when hiding the debate box
    setDebateMessages([]);
    setAssistantResponses([]); // Clear assistant responses as well
  }
  setShowDebateBox(prevState => !prevState); // Toggles debate input box visibility
};

  
  // Function to handle sending message for debate
  const handleSendDebateMessage = async () => {
    const messageInput = document.getElementById("debate-input").value;
    const endpoint = "https://api.openai.com/v1/chat/completions";
    const body = {
      model: "gpt-3.5-turbo-0613",
      messages: [
        { role: "user", content: messageInput },
        { role: "assistant", content: `The following is a debate between a human and an AI. The AI is talkative and provides lots of specific details from its context. The user perspective is ${messageInput}. Argue against it with evidence, facts, examples, anecdotes, and other persuasive tricks to convince the user of your stance` }
      ],
      ...PARAMS,
    };

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.REACT_APP_OPENAI_KEY}`
      },
      body: JSON.stringify(body)
    });

    const data = await response.json();
    const aiResponse = data.choices[0].message.content;

    // Set previous assistant response
    setAssistantPreviousResponse(aiResponse);

    setDebateMessages([...debateMessages, { role: "user", content: messageInput}, { role: "assistant", content: aiResponse }]);
    setAssistantResponses([...assistantResponses, aiResponse]);
  };

  // Function to handle user's reaction to assistant's response
  const handleUserReaction = async (reaction, previousResponse) => {
    if (reaction === 'thumbs-down') {
      // Ask assistant for a different response
      const endpoint = "https://api.openai.com/v1/chat/completions";
      const body = {
        model: "gpt-3.5-turbo-0613",
        messages: [
          { role: "user", content: `This is not persuasive to me ${previousResponse}. Persuade me using a different method, but on the same side.` }
        ],
        ...PARAMS,
      };

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.REACT_APP_OPENAI_KEY}`
        },
        body: JSON.stringify(body)
      });

      const data = await response.json();
      const aiResponse = data.choices[0].message.content;

      // Update state with new assistant response and user's reaction
      setAssistantResponses([...assistantResponses, aiResponse]);
      setUserReactions([...userReactions, 'thumbs-down']);
    } else if (reaction === 'thumbs-up') {
      // Update state with user's positive reaction
      setUserReactions([...userReactions, 'thumbs-up']);
    }
  };

  const handleReaction = (reaction) => {
    // You can implement the logic here to handle the reaction button clicks
  };

  // Function to expand the counterargument
  const handleExpandCounterArgument = (index) => {
    const expandedElement = document.getElementById(`expandedCounterArgument${index}`);
    if (expandedElement) {
      // Toggle display style
      const isExpanded = expandedElement.style.display === 'block';
      expandedElement.style.display = isExpanded ? 'none' : 'block';
    }
  };
  

  // Function to render assistant responses with thumbs up and thumbs down buttons
  const renderAssistantResponse = (response, index) => {
    return (
      <div key={index} className={showDebateBox ? "assistant-message" : "assistant-message hidden"}>
        {showDebateBox && (
          <div>
            <p>Assistant: {response}</p>
            <button onClick={() => handleUserReaction('thumbs-up')}>👍</button>
            <button onClick={() => handleUserReaction('thumbs-down', response)}>👎</button>
          </div>
        )}
      </div>
    );
  };

  return (
    <Container className='mt-3'>
      {!submitted ? (
        <>
          <Tabs
            id="question-type-tabs"
            activeKey={questionType}
            onSelect={(key) => setQuestionType(key)}
            className="mb-3"
          >
            <Tab eventKey="argumentation" title="Argumentation"></Tab>
          </Tabs>
          <h3 className='my-3'> <b> Enter your news article here: </b></h3>
          <form onSubmit={handleSendData}>
            <textarea
              rows={20}
              cols={80}
              value={userInput}
              onChange={e => setUserInput(e.target.value)}
              style={{ width: '100%' }}
              ref={userInputRef}
            />
            <Button variant="info" type="submit" className='mt-3'>Submit</Button>
          </form>
        </>
      ) : (
        <div style={{ display: 'flex' }}>
          <div style={{ width: '50%' }}>
            <h3 className='my-3'>User Input:</h3>
            <p onMouseUp={handleHighlightText} dangerouslySetInnerHTML={{ __html: highlightedUserInput }}></p>
            <Button variant="primary" onClick={() => setShowChatBox(prevState => !prevState)}>
              {showChatBox ? 'Hide Q&A' : 'Show Q&A'}
            </Button>
            {showExtraContextButton && (
              <Button variant="success" onClick={handleExtraContext} className="ml-2">
                Get Extra Context
              </Button>
            )}
            <Button variant="secondary" onClick={() => setHighlightModalOpen(true)} className="ml-2">
              Highlight Triggers
            </Button>
            <Button variant="primary" onClick={handleToggleDebateBox} className="ml-2">
              {showDebateBox ? 'Hide Debate' : 'DebateMe'} {/* Toggle button text based on state */}
            </Button>
          </div>
          <div style={{ width: '50%' }}>
            <div className="mt-3">
              <h3>Counterarguments</h3>
              {counterArguments.map((argument, index) => (
                <div key={index}>
                  <p><b>Argument:</b> {argument}</p>
                  <p>
                    <b>Counterargument:</b> {counterArgumentResponses[index].split('\n')[0]}
                    <span id={`expandedCounterArgument${index}`} style={{ display: 'none' }}>
                      {counterArgumentResponses[index].split('\n').slice(1).join('\n')}
                    </span>
                  </p>
                  <button onClick={() => handleExpandCounterArgument(index)}>Expand</button>
                  {/* Add heart and dislike emoji buttons */}
                  <div>
                    <button onClick={() => handleReaction('heart')}>❤️</button>
                    <button onClick={() => handleReaction('dislike')}>👎</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
      {showChatBox && (
        <div className="chat-box mt-3">
          {chatMessages.map((message, index) => (
            <div key={index} className={message.role === "user" ? "user-message" : "assistant-message"}>
              <p>{message.role === "user" ? "User: " : "Assistant: "}{message.content}</p>
            </div>
          ))}
          <div className="form-group mt-3" id="message-box">
            <textarea className="form-control" rows="3" placeholder="Type your message here" id="message-input"></textarea>
          </div>
          <Button variant="primary" onClick={handleSendChatMessage}>Send</Button>
        </div>
      )}
      {showDebateBox && (
        <div className="debate-box mt-3">
          <h3 className='my-3'>Debate Input:</h3>
          <textarea
            rows={5}
            cols={80}
            placeholder="Enter your argument here"
            style={{ width: '100%' }}
            id="debate-input"
            ref={debateInputRef}
          />
          <Button variant="primary" onClick={handleSendDebateMessage} className="mt-2">Send</Button>
          {debateMessages.map((message, index) => (
            <div key={index} className={message.role === "user" ? "user-message" : "assistant-message"}>
              <p>{message.role === "user" ? "User: " : "Assistant: "}{message.content}</p>
            </div>
          ))}
          {assistantPreviousResponse && (
            <div className="assistant-message mt-3">
              <p> </p>
            </div>
          )}
        </div>
      )}
      <Modal show={highlightModalOpen} onHide={() => setHighlightModalOpen(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Highlight Triggers</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p>{highlightedText}</p>
          {highlightedResponse && <p>Response: {highlightedResponse}</p>}
          <Button variant="primary" onClick={handleSendHighlightedText}>Send Highlighted Text</Button>
        </Modal.Body>
      </Modal>
      <Modal show={showExtraContextPopup} onHide={() => setShowExtraContextPopup(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Extra Context</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {extraContext}
        </Modal.Body>
      </Modal>
      <div className="assistant-responses mt-3">
        {assistantResponses.map((response, index) => (
          renderAssistantResponse(response, index)
        ))}
      </div>
    </Container>
  );
}

export default App;
