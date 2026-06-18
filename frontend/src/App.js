// App.js

import React from 'react';
//import { BrowserRouter as Router, Route, Switch } from 'react-router-dom';~
//import { Routes, Route,  Router} from 'react-router-dom';
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
// import Register  from './screens/Login/Register'; 
// import Login  from "./screens/Login/Login";
import Auth from "./screens/Login/Auth";
import Profile  from "./screens/Profile/Profile";
import Home  from "./screens/Profile/Home";
import CreatePost  from "./screens/Post/CreatePost";
import UserProfilePage  from "./screens/Profile/UserProfilePage";
import Groups  from "./screens/Groups/Groups";
import People from './screens/People/People'; 
import GroupPage from "./screens/Groups/GroupPage";
import EditProfile from "./screens/Profile/EditProfile";
import EditGroup from "./screens/Groups/EditGroup";
import EditPost from "./screens/Post/EditPost";
import TagPosts from "./screens/Post/TagPosts";
import PostPage from "./screens/Post/PostPage";
import About from './screens/About/About';
import Questionnaire from './screens/About/Questionnaire'; 
import Questionnaire2 from './screens/About/Questionnaire2';
import "./i18n";


function App() {
  return (
    <Router>
        <Routes>
          <Route path="/register" element={<Auth />} />
          <Route path="/login" element={<Auth />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/home" element={<Home />} />
          <Route path="/create-post" element={<CreatePost />} /> 
          <Route path="/users/:username" element={<UserProfilePage />} />
          <Route path="/groups" element={<Groups />} />
          <Route path="/people" element={<People />} /> 
          <Route path="/groups/:groupId" element={<GroupPage />} />
          <Route path="/edit-profile" element={<EditProfile />} />
          <Route path="/groups/:groupId/edit" element={<EditGroup />} />
          <Route path="/posts/:id/edit" element={<EditPost />} />
          <Route path="/tags/:tagName" element={<TagPosts />} />
          <Route path="/posts/:id" element={<PostPage />} />
          <Route path="/about" element={<About />} />
          <Route path="/questionnaire" element={<Questionnaire />} />
          <Route path="/questionnaire/2" element={<Questionnaire2 />} /> 
          <Route path="/" element={<Auth />} /> 
        </Routes>
    </Router>
  );
}

export default App;
