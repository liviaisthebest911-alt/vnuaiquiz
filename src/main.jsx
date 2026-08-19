import React from 'react'
import ReactDOM from 'react-dom/client'

import './index.css'
import App from './App'

class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props)

        this.state = {
            hasError: false,
            error: null,
        }
    }

    static getDerivedStateFromError(error) {
        return {
            hasError: true,
            error,
        }
    }

    componentDidCatch(error, errorInfo) {
        console.error('React Error:', error)
        console.error('Error Info:', errorInfo)
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="min-h-screen bg-slate-100 p-6">
                    <div className="mx-auto max-w-3xl rounded-2xl border border-red-200 bg-white p-6 shadow-lg">
                        <h1 className="text-2xl font-bold text-red-600">
                            Đã xảy ra lỗi khi tải website
                        </h1>

                        <p className="mt-2 text-sm text-slate-600">
                            Hãy kiểm tra lỗi bên dưới.
                        </p>

                        <pre className="mt-5 overflow-x-auto rounded-xl bg-slate-950 p-4 text-sm text-red-300">
              {this.state.error?.stack ||
                  String(this.state.error)}
            </pre>
                    </div>
                </div>
            )
        }

        return this.props.children
    }
}

ReactDOM.createRoot(
    document.getElementById('root'),
).render(
    <React.StrictMode>
        <ErrorBoundary>
            <App />
        </ErrorBoundary>
    </React.StrictMode>,
)