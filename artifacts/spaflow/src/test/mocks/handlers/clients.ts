import { http, HttpResponse } from 'msw';
import { createClient, createClientList } from '../factories';
import type { Client } from '@workspace/api-client-react';

/**
 * Client API handlers
 * Following 2026 best practices: realistic responses, organized by feature
 */

export const clientHandlers = [
  // GET /api/v1/clients
  http.get('/api/v1/clients', ({ request }) => {
    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = parseInt(url.searchParams.get('limit') || '50');
    const search = url.searchParams.get('search') || '';

    // Simulate search filtering
    if (search) {
      const allClients = createClientList(10).clients;
      const filteredClients = allClients.filter(
        (client) =>
          client.name &&
          client.email &&
          (client.name.toLowerCase().includes(search.toLowerCase()) ||
            client.email.toLowerCase().includes(search.toLowerCase()))
      );
      return HttpResponse.json({
        clients: filteredClients,
        total: filteredClients.length,
        page,
        limit,
      });
    }

    // Return paginated results
    return HttpResponse.json({
      clients: createClientList(10).clients,
      total: 10,
      page,
      limit,
    });
  }),

  // GET /api/v1/clients/:id
  http.get('/api/v1/clients/:id', ({ params }) => {
    const { id } = params;
    const idNum = Number(id);

    if (isNaN(idNum) || id === 'not-found') {
      return HttpResponse.json(
        { message: 'Client not found' },
        { status: 404 }
      );
    }

    return HttpResponse.json(createClient({ id: idNum }));
  }),

  // POST /api/v1/clients
  http.post('/api/v1/clients', () => {
    // For integration tests, always return success by default
    // Specific error scenarios are handled by overriding this handler in tests
    return HttpResponse.json(
      createClient({
        id: 1,
        name: 'New Client',
        email: 'newclient@example.com',
        phone: '555-5678',
      }),
      { status: 201 }
    );
  }),

  // PATCH /api/v1/clients/:id
  http.patch('/api/v1/clients/:id', ({ params }) => {
    const { id } = params;
    const idNum = Number(id);

    if (isNaN(idNum) || id === 'not-found') {
      return HttpResponse.json(
        { message: 'Client not found' },
        { status: 404 }
      );
    }

    return HttpResponse.json(
      createClient({
        id: idNum,
        name: 'Updated Name',
        email: 'updated@example.com',
      })
    );
  }),

  // DELETE /api/v1/clients/:id
  http.delete('/api/v1/clients/:id', ({ params }) => {
    const { id } = params;

    if (id === 'not-found') {
      return HttpResponse.json(
        { message: 'Client not found' },
        { status: 404 }
      );
    }

    return new HttpResponse(null, { status: 204 });
  }),
];
