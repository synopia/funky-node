import React, { Component } from 'react'
import { withFirebase } from '../Firebase'
import { Button, ButtonGroup, Col, Form, FormGroup, Input, Label, Row } from 'reactstrap'
import { DateTimePicker, DropdownList } from 'react-widgets'
import { Combobox } from 'react-widgets'
import 'react-widgets/lib/scss/react-widgets.scss'

class ResultForm extends Component {

  constructor (props) {
    super(props)

    let state = {
      authorID: null,
      id: false,
      date: this.props.firebase.getCurrentDate(),
      gameID: null,
      image: null,
      location: null,
      notes: "",
      playerIDs: [],
      playerNames: [],
      scores: [
        {score: 0, players: [{nick: ""}]}
      ],
      gameList: null,
      playerList: null,
    }
    if (this.props.result) {
      state = {
        ...this.props.result,
      }
      state.scores = state.scores.map((score) => {
        score.players.push({nick: ""})
        return score
      })
      state.scores.push({score: 0, players: [{nick: ""}]})
    }

    this.state = state
  }

  componentDidMount() {
    this.loadGames()
    this.loadPlayers()
  }

  loadGames = () => {
    if (this.state.gameList) {
      return
    }
    this.props.firebase.games()
      .then((snapshots) => {
        let gameList = []
        snapshots.forEach((snapshot) => {
          gameList.push({
            ...snapshot.data(),
            id: snapshot.id,
          })
        })
        this.setState({gameList})
      })
  }

  loadPlayers = () => {
    if (this.state.playerList) {
      return
    }
    this.props.firebase.players()
      .then((snapshots) => {
        let playerList = []
        snapshots.forEach((snapshot) => {
          playerList.push({
            ...snapshot.data(),
            id: snapshot.id,
          })
        })
        this.setState({playerList})
      })
  }

  onChange = (data) => {
    this.setState(data)
  }

  onChangeScore = (i, score) => {
    let scores = this.state.scores
    scores[i].score = Number(score)
    scores = scores.filter((score) => !this.isScoreEmpty(score))
    scores.push({score: 0, players: [{nick: ''}]})
    this.onChange({ scores })
  }

  onChangePlayer = (i, j, playerName) => {
    let player = {}
    if (typeof playerName === 'string') {
      player = { nick: playerName }
    }
    else {
      player = playerName
    }
    let scores = this.state.scores
    scores[i].players[j] = player
    scores[i].players = scores[i].players.filter(player => player.nick !== '')
    scores = scores.filter((score) => !this.isScoreEmpty(score))
    scores[i].players.push({nick: ''})
    scores.push({score: 0, players: [{nick: ''}]})

    let playerIDs = [], playerNames = []
    scores.forEach(score => score.players.forEach(player => {
      playerIDs.push(player.id)
      playerNames.push(player.nick)
    }))
    playerIDs = playerIDs.filter((value, index, self) => typeof value !== 'undefined' && value !== '' && self.indexOf(value) === index)
    playerNames = playerNames.filter((value, index, self) => typeof value !== 'undefined' && value !== '' && self.indexOf(value) === index)
    this.onChange({ scores, playerIDs, playerNames })
  }

  filterSelectablePlayers = (player, value) => {
    if (player.nick === value) return true
    if (this.state.playerNames.indexOf(player.nick) === -1) {
      return player.nick.toLowerCase().startsWith(value.toLowerCase())
    }
    else {
      return false
    }
  }

  onChangeGame = (value) => {
    if (typeof value === 'string') {
      this.setState({
        game: {
          name: value,
        }
      })
    }
    else {
      this.setState({
        game: value
      })
    }
  }

  isScoreEmpty = (score) => {
    return !score.score && (score.players.length === 0 || (score.players.length === 1 && score.players[0].nick === ''))
  }

  onSave = () => {
    let result = {
      authorID: this.state.authorID ? this.state.authorID : this.props.user.uid,
      date: this.state.date,
      gameID: this.state.game.id,
      image: this.state.image,
      location: this.state.location,
      notes: this.state.notes,
      scores: this.state.scores,
    }
    let players = []
    result.scores = result.scores.filter((score) => !this.isScoreEmpty(score))
    result.scores = result.scores.map((score) => {
      score.score = Number(score.score)
      score.players = score.players.filter(player => player.nick !== '')
      score.players.forEach((player) => {
        players.push(this.props.firebase.playerByNameSnapshot(player.nick))
      })
      return score
    })

    Promise.all(players)
      .then((playerSnapshots) => {
        let players = {}
        playerSnapshots.forEach((playerSnapshot) => {
          let data = playerSnapshot.data()
          players[data.nick] = playerSnapshot.ref
        })
        result.scores = result.scores.map((score) => {
          score.players = score.players.map((player) => players[player.nick])
          return score
        })
        // update
        if (this.state.id) {
          return this.props.firebase.result(this.state.id)
            .set(result)
            .then(() => {
              return {
                ...result,
                id: this.state.id,
              }
            })
        }
        // create
        else {
          return this.props.firebase.resultAdd(result)
            .then((ref) => ref.get())
            .then((snapshot) => {
              return {
                ...snapshot.data(),
                id: snapshot.id,
              }
            })
        }
      })
      .then((result) => {
        if (this.props.onSave) {
          this.props.firebase.resultsResolvePlayers([result])
            .then((results) => {
              let result = results.pop()
              result.isNew = !this.state.id
              this.props.onSave(result)
            })
        }
      })
  }

  onDelete = () => {
    this.props.firebase.result(this.state.id)
      .delete()
      .then(() => {
        if (this.props.onDelete) {
          this.props.onDelete(this.state.id)
        }
      })
  }

  render() {
    return (
      <Form onSubmit={(event) => event.preventDefault()}>
        <FormGroup row>
          <Label for="dateJS" sm={2}>Date</Label>
          <Col sm={10}>
            <DateTimePicker name="dateJS" placeholder="Date" value={this.state.date.toDate()} onChange={dateJS => this.onChange({date: this.props.firebase.Timestamp.fromDate(dateJS)})} />
          </Col>
        </FormGroup>
        <FormGroup row>
          <Label for="gamename" sm={2}>Game</Label>
          <Col sm={10}>
            <DropdownList value={this.state.game} name="gamename" data={this.state.gameList} busy={this.state.gameList === null} textField="name" placeholder="Game" onChange={this.onChangeGame} filter="startsWith" />
          </Col>
        </FormGroup>
        {
          this.state.scores.map((score, i) => (
            <FormGroup key={i}>
              <Row>
                <Col>Team {i+1}</Col>
              </Row>
              <Row>
                <Label for={`scores[${i}][score]`} sm={{size: 2, offset: 1}}>Score</Label>
                <Col sm={9}>
                  <Input type="text" placeholder="Score" value={score.score} onChange={event => this.onChangeScore(i, event.target.value)} name={`scores[${i}][score]`} autoComplete="off" />
                </Col>
              </Row>
              <Row>
                <Label for={`scores[${i}][players]`} sm={{size: 2, offset: 1}}>Players</Label>
                <Col sm={9}>
                  { score.players.map((player, j) => (
                    <Combobox key={j} placeholder="Nickname" value={player} textField="nick" data={this.state.playerList} busy={this.state.playerList === null} filter={this.filterSelectablePlayers} onChange={value => this.onChangePlayer(i, j, value)} name={`scores[${i}][players][${j}]`} autoComplete="off" />
                  ))}
                </Col>
              </Row>
            </FormGroup>
          ))
        }
        <FormGroup row>
          <Label for="notes" sm={2}>Note</Label>
          <Col sm={10}>
            <Input type="textarea" placeholder="Notes" value={this.state.notes} rows={5} onChange={event => this.onChange({notes: event.target.value})}/>
          </Col>
        </FormGroup>
        <FormGroup row>
          <ButtonGroup className="col-sm-3 offset-sm-9">
            {this.props.user && this.state.id && this.props.user.uid === this.state.authorID &&
            <Button color="danger" type="submit" onClick={this.onDelete}>Delete</Button>}
            {this.props.user &&
            <Button color="primary" type="submit" onClick={this.onSave}>Save</Button>}
          </ButtonGroup>
        </FormGroup>
      </Form>
    )
  }

}

export default withFirebase(ResultForm)