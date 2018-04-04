import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';

import { VisboUser } from '../_models/Login';

@Injectable()
export class UserService {
    constructor(private http: HttpClient) { }

    getAll() {
        return this.http.get<VisboUser[]>('/api/users');
    }

    getById(id: number) {
        return this.http.get('/api/users/' + id);
    }

    create(user: VisboUser) {
        return this.http.post('/api/users', user);
    }

    update(user: VisboUser) {
        return this.http.put('/api/users/' + user._id, user);
    }

    delete(id: number) {
        return this.http.delete('/api/users/' + id);
    }
}
