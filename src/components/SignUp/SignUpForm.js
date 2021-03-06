import * as ROUTES from '../../constants/routes'
import React, { Component } from 'react'
import { compose } from 'recompose'
import { withFirebase } from '../Firebase'
import { withRouter } from 'react-router-dom'
import { Button, Form, Input, Alert, FormGroup } from 'reactstrap'

const INITIAL_STATE = {
  username: '',
  email: '',
  passwordOne: '',
  passwordTwo: '',
  error: null,
}

const ERROR_CODE_ACCOUNT_EXISTS = 'auth/email-already-in-use'
const ERROR_MSG_ACCOUNT_EXISTS = `
An account with this E-Mail address already exists.
Try to login with this account instead. If you think the
account is already used from one of the social logins, try
to sign-in with one of them. Afterward, associate your accounts
on your personal account page.`

class SignUpForm extends Component {
  constructor (props) {
    super(props)

    this.state = {...INITIAL_STATE}
  }

  onSubmit = event => {
    const {username, email, passwordOne} = this.state
    this.props.firebase
      .doCreateUserWithEmailAndPassword(email, passwordOne)
      .then(authUser => {
        // Create a user in your Firebase realtime database
        return this.props.firebase
          .user(authUser.user.uid)
          .set({
            username,
            email,
            roles: {}
          })
      })
      .then(authUser => {
        this.setState({...INITIAL_STATE})
        this.props.history.push(ROUTES.HOME)
      })
      .catch(error => {
        if (error.code === ERROR_CODE_ACCOUNT_EXISTS) {
          error.message = ERROR_MSG_ACCOUNT_EXISTS
        }
        this.setState({error})
      })

    event.preventDefault()
  }

  onChange = event => {
    this.setState({[event.target.name]: event.target.value})
  }

  onChangeCheckbox = event => {
    this.setState({[event.target.name]: event.target.checked})
  }

  render () {
    const {
      username,
      email,
      passwordOne,
      passwordTwo,
      error,
    } = this.state

    const isInvalid =
      passwordOne !== passwordTwo ||
      passwordOne === '' ||
      email === '' ||
      username === ''

    return (
      <Form onSubmit={this.onSubmit}>
        {error && <Alert>{error.message}</Alert>}
        <FormGroup>
          <Input
            name="username"
            value={username}
            onChange={this.onChange}
            type="text"
            placeholder="Full Name"
          />
        </FormGroup>
        <FormGroup>
          <Input
            name="email"
            value={email}
            onChange={this.onChange}
            type="text"
            placeholder="Email Address"
          />
        </FormGroup>
        <FormGroup>
          <Input
            name="passwordOne"
            value={passwordOne}
            onChange={this.onChange}
            type="password"
            placeholder="Password"
          />
        </FormGroup>
        <FormGroup>
          <Input
            name="passwordTwo"
            value={passwordTwo}
            onChange={this.onChange}
            type="password"
            placeholder="Confirm Password"
          />
        </FormGroup>
        <Button disabled={isInvalid} type="submit" className="col-sm-12 col-md-3 offset-md-9">
          Sign Up
        </Button>
      </Form>
    )
  }
}

export default compose(
  withRouter,
  withFirebase,
)(SignUpForm)
