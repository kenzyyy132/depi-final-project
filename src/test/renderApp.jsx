import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Root from '../Root';

export const renderApp = (path = '/') => render(<MemoryRouter initialEntries={[path]}><Root /></MemoryRouter>);
