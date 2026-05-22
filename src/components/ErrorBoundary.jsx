import { Component } from 'react'

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null })
    if (this.props.onReset) {
      this.props.onReset()
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: 40, textAlign: 'center', fontFamily: 'Poppins, sans-serif' }}>
          <h2 style={{ color: '#7d2447' }}>Ocurrió un error inesperado</h2>
          <p style={{ color: '#666', marginTop: 8 }}>{this.state.error?.message || 'Reintenta subiendo el archivo nuevamente.'}</p>
          <button
            style={{ marginTop: 16, padding: '10px 22px', background: '#7d2447', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontFamily: 'inherit' }}
            onClick={this.handleRetry}
          >
            Reintentar
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
